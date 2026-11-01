<?php
require 'external-db-sync.inc.php';
require 'http-response.inc.php';
session_start();
require 'inactivity.php';

if (!isset($_SESSION['userId']) || !isset($_SESSION['sessionTimeStamp'])) {
    finishRequest('/', 'loggedout');
}
if (!isset($_POST['create-account-submit'])) {
    finishRequest('/accounts/');
}

$steamId = $_SESSION['steamId'] ?? '';
$accountNameInput = $_POST['accountName'] ?? '';
if (!preg_match('/^[0-9]{17}$/', $steamId)) {
    finishRequest('/accounts/?error=steamidrequired', 'steamidrequired');
}
if (!is_string($accountNameInput)) {
    finishRequest('/accounts/?error=invalidaccountname', 'invalidaccountname');
}

$accountName = trim($accountNameInput);
$accountNameLength = preg_match_all('/./us', $accountName);
if ($accountNameLength === false || $accountNameLength < 1 || $accountNameLength > 40) {
    finishRequest('/accounts/?error=invalidaccountname', 'invalidaccountname');
}

try {
    createExternalPlayerAccount($steamId, $accountName);
} catch (SupabaseRequestException $error) {
    error_log('Account creation failed while creating a Supabase account: '.$error->getMessage());
    $errorCode = match ($error->getSupabaseMessage()) {
        'account_name_taken' => 'accountnametaken',
        'invalid_account_name' => 'invalidaccountname',
        default => $error->getSupabaseCode() === '23505'
            && str_contains($error->getSupabaseMessage(), 'accounts_player_name_unique')
                ? 'accountnametaken'
                : 'supabaseunavailable'
    };
    finishRequest('/accounts/?error='.$errorCode, $errorCode);
}

finishRequest('/accounts/?account=created');
