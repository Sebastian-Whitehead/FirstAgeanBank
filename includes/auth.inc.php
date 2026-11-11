<?php
require_once __DIR__.'/supabase.inc.php';

final class AuthenticatedPlayerException extends RuntimeException
{
    private string $errorCode;

    public function __construct(string $message, string $errorCode)
    {
        parent::__construct($message);
        $this->errorCode = $errorCode;
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }
}

function currentAuthenticatedPlayer(): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+([A-Za-z0-9._~-]+)$/i', $authorization, $matches)) {
        throw new AuthenticatedPlayerException('Sign in is required.', 'loggedout');
    }

    try {
        $authUser = supabaseAuthUser($matches[1]);
    } catch (SupabaseRequestException $error) {
        throw new AuthenticatedPlayerException('The authentication service is unavailable.', 'supabaseunavailable');
    }
    if ($authUser === null) {
        throw new AuthenticatedPlayerException('The session is invalid or expired.', 'loggedout');
    }

    $email = $authUser['email'] ?? '';
    $username = $authUser['user_metadata']['username'] ?? '';
    if (
        !is_string($email)
        || !filter_var($email, FILTER_VALIDATE_EMAIL)
        || !is_string($username)
        || !preg_match('/^[a-z0-9]{1,64}$/', $username)
    ) {
        throw new AuthenticatedPlayerException('The account does not have a supported email and username.', 'loggedout');
    }
    $identities = $authUser['identities'] ?? [];
    if (!is_array($identities)) {
        throw new AuthenticatedPlayerException('Discord verification is required.', 'discordrequired');
    }

    $discordId = null;
    foreach ($identities as $identity) {
        if (!is_array($identity) || ($identity['provider'] ?? null) !== 'discord') {
            continue;
        }
        $identityData = $identity['identity_data'] ?? [];
        if (!is_array($identityData)) {
            continue;
        }
        $candidate = $identityData['sub'] ?? $identityData['id'] ?? null;
        if (is_int($candidate) || is_string($candidate)) {
            $discordId = (string)$candidate;
            break;
        }
    }
    if ($discordId === null || !preg_match('/^[0-9]{17,19}$/', $discordId)) {
        throw new AuthenticatedPlayerException('Discord verification is required.', 'discordrequired');
    }

    try {
        $players = supabaseFindPlayersByDiscordId($discordId);
    } catch (SupabaseRequestException $error) {
        throw new AuthenticatedPlayerException('The shared identity service is unavailable.', 'supabaseunavailable');
    }
    if (count($players) === 0) {
        throw new AuthenticatedPlayerException('No existing player identity is linked to this Discord account.', 'identitynotfound');
    }
    if (count($players) !== 1) {
        error_log('Discord ID matched multiple Supabase player identities.');
        throw new AuthenticatedPlayerException('The player identity lookup was ambiguous.', 'identityambiguous');
    }

    $player = $players[0];
    $steamId = isset($player['steam_id']) ? (string)$player['steam_id'] : '';
    $storedDiscordId = isset($player['discord_id']) ? (string)$player['discord_id'] : '';
    if (!preg_match('/^[0-9]{17}$/', $steamId) || $storedDiscordId !== $discordId) {
        throw new AuthenticatedPlayerException('The existing player identity is incomplete.', 'identityunavailable');
    }

    return [
        'username' => $username,
        'email' => $email,
        'firstname' => is_string($player['alias'] ?? null) && $player['alias'] !== ''
            ? $player['alias']
            : $username,
        'steamId' => $steamId,
        'discordId' => $discordId
    ];
}

function requireAuthenticatedPlayer(): array
{
    try {
        return currentAuthenticatedPlayer();
    } catch (AuthenticatedPlayerException $error) {
        if (isJsonRequest()) {
            http_response_code(match ($error->getErrorCode()) {
                'loggedout' => 401,
                'identitynotfound', 'discordrequired' => 403,
                default => 503
            });
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => $error->getErrorCode(), 'message' => $error->getMessage()]);
            exit();
        }
        finishRequest('/?error='.$error->getErrorCode(), $error->getErrorCode());
    }
}
