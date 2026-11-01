<?php
require_once __DIR__.'/supabase.inc.php';

function syncExternalUserOnSignup(array $signupData): ?array
{
    return supabaseRpc('fab_ensure_player_account', [
        'p_alias' => $signupData['uidUsers'],
        'p_steam_id' => $signupData['steamId'],
        'p_discord_id' => $signupData['discordId']
    ]);
}

function syncExternalUserOnLogin(array $userData): ?array
{
    return supabaseRpc('fab_ensure_player_account', [
        'p_alias' => $userData['uidUsers'],
        'p_steam_id' => $userData['steamId'],
        'p_discord_id' => $userData['discordId']
    ]);
}

function syncExternalAccountInfoUpdate(array $accountInfo): ?array
{
    return supabaseRpc('fab_update_player_identity', [
        'p_old_steam_id' => $accountInfo['oldSteamId'] !== '' ? $accountInfo['oldSteamId'] : null,
        'p_new_steam_id' => $accountInfo['steamId'],
        'p_discord_id' => $accountInfo['discordId'],
        'p_alias' => $accountInfo['alias']
    ]);
}

function createExternalPlayerAccount(string $steamId, string $accountName): ?array
{
    return supabaseRpc('fab_create_player_account', [
        'p_steam_id' => $steamId,
        'p_account_name' => $accountName
    ]);
}

function renameExternalPlayerAccount(string $steamId, string $accountNumber, string $accountName): ?array
{
    return supabaseRpc('fab_rename_player_account', [
        'p_steam_id' => $steamId,
        'p_account_number' => $accountNumber,
        'p_account_name' => $accountName
    ]);
}

function deleteExternalPlayerAccount(string $steamId, string $accountNumber): ?array
{
    return supabaseRpc('fab_delete_player_account', [
        'p_steam_id' => $steamId,
        'p_account_number' => $accountNumber
    ]);
}
