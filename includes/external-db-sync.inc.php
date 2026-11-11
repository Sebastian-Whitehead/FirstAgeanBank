<?php
require_once __DIR__.'/supabase.inc.php';

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
