<?php

final class SupabaseRequestException extends RuntimeException
{
    private string $supabaseCode;
    private string $supabaseMessage;

    public function __construct(string $message, string $supabaseCode = '', string $supabaseMessage = '')
    {
        parent::__construct($message);
        $this->supabaseCode = $supabaseCode;
        $this->supabaseMessage = $supabaseMessage;
    }

    public function getSupabaseCode(): string
    {
        return $this->supabaseCode;
    }

    public function getSupabaseMessage(): string
    {
        return $this->supabaseMessage;
    }
}

function supabaseRpc(string $function, array $parameters): ?array
{
    if (!preg_match('/^[a-z][a-z0-9_]*$/', $function)) {
        throw new InvalidArgumentException('Invalid Supabase RPC function name.');
    }

    $baseUrl = rtrim(getenv('SUPABASE_URL') ?: '', '/');
    $serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '';
    $urlParts = parse_url($baseUrl);
    if (
        $baseUrl === ''
        || $serviceKey === ''
        || !is_array($urlParts)
        || !isset($urlParts['scheme'], $urlParts['host'])
        || !in_array($urlParts['scheme'], ['https', 'http'], true)
        || ($urlParts['scheme'] === 'http' && !in_array($urlParts['host'], ['localhost', '127.0.0.1'], true))
    ) {
        throw new SupabaseRequestException('Supabase is not configured.');
    }

    try {
        $body = json_encode($parameters, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Unable to prepare the Supabase request.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'apikey: '.$serviceKey,
                'Authorization: Bearer '.$serviceKey,
                'Content-Type: application/json',
                'Accept: application/json'
            ]),
            'content' => $body,
            'timeout' => 12,
            'ignore_errors' => true
        ]
    ]);

    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });
    try {
        $responseBody = file_get_contents($baseUrl.'/rest/v1/rpc/'.$function, false, $context);
    } catch (Throwable $error) {
        error_log('Supabase request failed: '.$error->getMessage());
        throw new SupabaseRequestException('Supabase is unavailable.');
    } finally {
        restore_error_handler();
    }

    $statusLine = $http_response_header[0] ?? '';
    if (!preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch)) {
        throw new SupabaseRequestException('Supabase returned an invalid response.');
    }
    $status = (int)$statusMatch[1];
    $response = null;
    if (is_string($responseBody) && $responseBody !== '') {
        try {
            $response = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new SupabaseRequestException('Supabase returned an invalid response.');
        }
    }

    if ($status < 200 || $status >= 300) {
        $supabaseCode = is_array($response) && is_string($response['code'] ?? null)
            ? $response['code']
            : '';
        $message = is_array($response) && is_string($response['message'] ?? null)
            ? $response['message']
            : 'request error';
        error_log('Supabase RPC '.$function.' failed with HTTP '.$status.' ('.$supabaseCode.'): '.$message);
        throw new SupabaseRequestException('Supabase request failed.', $supabaseCode, $message);
    }

    if ($response === null) {
        return null;
    }
    if (!is_array($response)) {
        throw new SupabaseRequestException('Supabase returned an unexpected response.');
    }

    return $response;
}

function supabaseAuthUser(string $accessToken): ?array
{
    $baseUrl = rtrim(getenv('SUPABASE_URL') ?: '', '/');
    $publishableKey = getenv('SUPABASE_PUBLISHABLE_KEY') ?: '';
    $urlParts = parse_url($baseUrl);
    if (
        $baseUrl === ''
        || $publishableKey === ''
        || !is_array($urlParts)
        || !isset($urlParts['scheme'], $urlParts['host'])
        || !in_array($urlParts['scheme'], ['https', 'http'], true)
        || ($urlParts['scheme'] === 'http' && !in_array($urlParts['host'], ['localhost', '127.0.0.1'], true))
    ) {
        throw new SupabaseRequestException('Supabase Auth is not configured.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: '.$publishableKey,
                'Authorization: Bearer '.$accessToken,
                'Accept: application/json'
            ]),
            'timeout' => 12,
            'ignore_errors' => true
        ]
    ]);

    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });
    try {
        $responseBody = file_get_contents($baseUrl.'/auth/v1/user', false, $context);
    } catch (Throwable $error) {
        error_log('Supabase Auth request failed: '.$error->getMessage());
        throw new SupabaseRequestException('Supabase Auth is unavailable.');
    } finally {
        restore_error_handler();
    }

    $statusLine = $http_response_header[0] ?? '';
    if (!preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch)) {
        throw new SupabaseRequestException('Supabase Auth returned an invalid response.');
    }
    $status = (int)$statusMatch[1];
    if ($status === 401 || $status === 403) {
        return null;
    }
    if ($status < 200 || $status >= 300 || !is_string($responseBody)) {
        error_log('Supabase Auth user lookup failed with HTTP '.$status.'.');
        throw new SupabaseRequestException('Supabase Auth request failed.');
    }

    try {
        $user = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Supabase Auth returned an invalid response.');
    }
    if (!is_array($user) || !is_string($user['id'] ?? null)) {
        throw new SupabaseRequestException('Supabase Auth returned an unexpected response.');
    }
    return $user;
}

function supabaseFindPlayersByDiscordId(string $discordId): array
{
    $baseUrl = rtrim(getenv('SUPABASE_URL') ?: '', '/');
    $serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '';
    $urlParts = parse_url($baseUrl);
    if (
        $baseUrl === ''
        || $serviceKey === ''
        || !is_array($urlParts)
        || !isset($urlParts['scheme'], $urlParts['host'])
        || !in_array($urlParts['scheme'], ['https', 'http'], true)
        || ($urlParts['scheme'] === 'http' && !in_array($urlParts['host'], ['localhost', '127.0.0.1'], true))
    ) {
        throw new SupabaseRequestException('Supabase is not configured.');
    }

    $query = http_build_query([
        'discord_id' => 'eq.'.$discordId,
        'select' => 'alias,steam_id,discord_id',
        'limit' => '2'
    ]);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", [
                'apikey: '.$serviceKey,
                'Authorization: Bearer '.$serviceKey,
                'Accept: application/json'
            ]),
            'timeout' => 12,
            'ignore_errors' => true
        ]
    ]);

    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });
    try {
        $responseBody = file_get_contents($baseUrl.'/rest/v1/identities_player?'.$query, false, $context);
    } catch (Throwable $error) {
        error_log('Supabase identity lookup failed: '.$error->getMessage());
        throw new SupabaseRequestException('Supabase is unavailable.');
    } finally {
        restore_error_handler();
    }

    $statusLine = $http_response_header[0] ?? '';
    if (!preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch)) {
        throw new SupabaseRequestException('Supabase returned an invalid identity response.');
    }
    $status = (int)$statusMatch[1];
    if ($status < 200 || $status >= 300 || !is_string($responseBody)) {
        error_log('Supabase identity lookup failed with HTTP '.$status.'.');
        throw new SupabaseRequestException('Supabase identity lookup failed.');
    }

    try {
        $players = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Supabase returned an invalid identity response.');
    }
    if (!is_array($players) || !array_is_list($players)) {
        throw new SupabaseRequestException('Supabase returned an unexpected identity response.');
    }
    return $players;
}

function supabaseGetAuthEmailForUsername(string $username): ?string
{
    $result = supabaseRpc('fab_get_auth_email_for_username', [
        'p_username' => $username
    ]);
    if ($result === null || !array_is_list($result) || count($result) > 1) {
        throw new SupabaseRequestException('Supabase returned an unexpected username lookup response.');
    }
    if ($result === []) {
        return null;
    }

    $row = $result[0];
    if (!is_array($row)) {
        throw new SupabaseRequestException('Supabase returned an invalid username lookup response.');
    }
    $email = $row['email'] ?? null;
    if (!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new SupabaseRequestException('Supabase returned an invalid username lookup response.');
    }
    return $email;
}

function supabaseRegisterAuthUsername(string $username, string $email): bool
{
    $result = supabaseRpc('fab_register_auth_username', [
        'p_username' => $username,
        'p_email' => strtolower($email)
    ]);
    if ($result === null || !array_is_list($result) || count($result) !== 1) {
        throw new SupabaseRequestException('Supabase returned an unexpected username registration response.');
    }

    $row = $result[0];
    if (!is_array($row)) {
        throw new SupabaseRequestException('Supabase returned an invalid username registration response.');
    }
    $success = $row['success'] ?? null;
    if (!is_bool($success)) {
        throw new SupabaseRequestException('Supabase returned an invalid username registration response.');
    }
    return $success;
}

function supabasePasswordSignIn(string $email, string $password): ?array
{
    $baseUrl = rtrim(getenv('SUPABASE_URL') ?: '', '/');
    $publishableKey = getenv('SUPABASE_PUBLISHABLE_KEY') ?: '';
    $urlParts = parse_url($baseUrl);
    if (
        $baseUrl === ''
        || $publishableKey === ''
        || !is_array($urlParts)
        || !isset($urlParts['scheme'], $urlParts['host'])
        || !in_array($urlParts['scheme'], ['https', 'http'], true)
        || ($urlParts['scheme'] === 'http' && !in_array($urlParts['host'], ['localhost', '127.0.0.1'], true))
    ) {
        throw new SupabaseRequestException('Supabase Auth is not configured.');
    }

    try {
        $body = json_encode([
            'email' => $email,
            'password' => $password
        ], JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Unable to prepare the Supabase Auth request.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'apikey: '.$publishableKey,
                'Content-Type: application/json',
                'Accept: application/json'
            ]),
            'content' => $body,
            'timeout' => 12,
            'ignore_errors' => true
        ]
    ]);

    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });
    try {
        $responseBody = file_get_contents($baseUrl.'/auth/v1/token?grant_type=password', false, $context);
    } catch (Throwable $error) {
        error_log('Supabase password authentication failed: '.$error->getMessage());
        throw new SupabaseRequestException('Supabase Auth is unavailable.');
    } finally {
        restore_error_handler();
    }

    $statusLine = $http_response_header[0] ?? '';
    if (!preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch)) {
        throw new SupabaseRequestException('Supabase Auth returned an invalid response.');
    }
    $status = (int)$statusMatch[1];
    if ($status === 400 || $status === 401) {
        return null;
    }
    if ($status < 200 || $status >= 300 || !is_string($responseBody)) {
        error_log('Supabase password authentication returned HTTP '.$status.'.');
        throw new SupabaseRequestException('Supabase password authentication failed.');
    }

    try {
        $session = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Supabase Auth returned an invalid response.');
    }
    if (
        !is_array($session)
        || !is_string($session['access_token'] ?? null)
        || !is_string($session['refresh_token'] ?? null)
    ) {
        throw new SupabaseRequestException('Supabase Auth returned an unexpected session response.');
    }
    return $session;
}
