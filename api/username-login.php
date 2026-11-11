<?php
require __DIR__.'/../includes/supabase.inc.php';
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'invalidrequest', 'message' => 'Use POST for username sign-in.']);
    exit();
}

$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 4096) {
    http_response_code(413);
    echo json_encode(['error' => 'invalidrequest', 'message' => 'The sign-in request is too large.']);
    exit();
}

try {
    $input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    http_response_code(400);
    echo json_encode(['error' => 'invalidrequest', 'message' => 'Invalid sign-in request.']);
    exit();
}

$username = is_array($input) && is_string($input['username'] ?? null)
    ? strtolower(trim($input['username']))
    : '';
$password = is_array($input) && is_string($input['password'] ?? null)
    ? $input['password']
    : '';
if (!preg_match('/^[a-z0-9]{1,64}$/', $username) || $password === '' || strlen($password) > 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'invalidrequest', 'message' => 'Enter a valid username and password.']);
    exit();
}

$email = null;
try {
    $email = supabaseGetAuthEmailForUsername($username);
} catch (SupabaseRequestException $error) {
    error_log('Username sign-in failed during Supabase username lookup: '.$error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'authunavailable', 'message' => 'Sign-in is temporarily unavailable.']);
    exit();
}
if ($email === null) {
    http_response_code(401);
    echo json_encode(['error' => 'invalidcredentials', 'message' => 'The username or password is incorrect.']);
    exit();
}

try {
    $session = supabasePasswordSignIn($email, $password);
} catch (SupabaseRequestException $error) {
    error_log('Username sign-in failed during Supabase authentication: '.$error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'authunavailable', 'message' => 'Sign-in is temporarily unavailable.']);
    exit();
}
if ($session === null) {
    http_response_code(401);
    echo json_encode(['error' => 'invalidcredentials', 'message' => 'The username or password is incorrect.']);
    exit();
}

echo json_encode([
    'access_token' => $session['access_token'],
    'refresh_token' => $session['refresh_token']
]);
