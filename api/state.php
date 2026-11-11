<?php
require __DIR__.'/../includes/http-response.inc.php';
require __DIR__.'/../includes/auth.inc.php';
header('Content-Type: application/json; charset=utf-8');

$player = requireAuthenticatedPlayer();
try {
    $account = supabaseRpc('fab_get_player_account', [
        'p_steam_id' => $player['steamId'],
        'p_limit' => 15
    ]);
} catch (SupabaseRequestException $error) {
    error_log('Unable to load Supabase account state: '.$error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'supabaseunavailable', 'message' => 'Unable to load account state.']);
    exit();
}

if ($account === null) {
    error_log('No Supabase player account is linked to the authenticated Discord identity.');
    http_response_code(503);
    echo json_encode(['error' => 'identityunavailable', 'message' => 'Unable to load account state.']);
    exit();
}

$accounts = $account['accounts'] ?? [];
if (!is_array($accounts)) {
    error_log('Supabase returned an invalid player account list.');
    http_response_code(503);
    echo json_encode(['error' => 'supabaseunavailable', 'message' => 'Unable to load account state.']);
    exit();
}

echo json_encode([
    'authenticated' => true,
    'user' => [
        'username' => $player['username'],
        'firstname' => $player['firstname'],
        'lastname' => '',
        'accounts' => array_map(static function (array $account): array {
            return [
                'accountNumber' => $account['account_number'],
                'name' => $account['account_name'] ?? '',
                'type' => $account['account_type'],
                'balance' => (int)$account['money'] / 100
            ];
        }, $accounts),
        'steamId' => $player['steamId'],
        'discordId' => $player['discordId']
    ],
    'activities' => $account['activities'] ?? []
]);
