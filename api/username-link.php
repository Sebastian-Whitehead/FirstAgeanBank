<?php
require __DIR__.'/../includes/http-response.inc.php';
require __DIR__.'/../includes/auth.inc.php';
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'invalidrequest', 'message' => 'Use POST to save the username.']);
    exit();
}

$player = requireAuthenticatedPlayer();
try {
    $success = supabaseRegisterAuthUsername($player['username'], $player['email']);
} catch (SupabaseRequestException $error) {
    error_log('Username registration failed in Supabase: '.$error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'usernameunavailable', 'message' => 'Could not save your username.']);
    exit();
}
if (!$success) {
    http_response_code(409);
    echo json_encode(['error' => 'usernametaken', 'message' => 'That username is already in use.']);
    exit();
}
echo json_encode(['success' => true]);
