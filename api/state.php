<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['authenticated' => false]);
    exit();
}

if (!isset($_SESSION['sessionTimeStamp']) || time() - (int)$_SESSION['sessionTimeStamp'] >= 900) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'error' => 'sessionexpired']);
    exit();
}

$_SESSION['sessionTimeStamp'] = time();
require __DIR__.'/../includes/dbh.inc.php';
require __DIR__.'/../includes/activity-table.inc.php';

$stmt = mysqli_prepare(
    $conn,
    "SELECT uidUsers, firstname, lastname, accountBalance, steamId, discordId
     FROM users WHERE idUsers=?"
);
if (!$stmt) {
    error_log("Unable to prepare session state query: ".mysqli_error($conn));
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load account state.']);
    exit();
}

$userId = (int)$_SESSION['userId'];
mysqli_stmt_bind_param($stmt, 'i', $userId);
if (!mysqli_stmt_execute($stmt)) {
    error_log("Unable to query session state: ".mysqli_stmt_error($stmt));
    mysqli_stmt_close($stmt);
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load account state.']);
    exit();
}

$result = mysqli_stmt_get_result($stmt);
$user = mysqli_fetch_assoc($result);
mysqli_stmt_close($stmt);
if ($user === null) {
    session_unset();
    session_destroy();
    http_response_code(401);
    echo json_encode(['authenticated' => false]);
    exit();
}

echo json_encode([
    'authenticated' => true,
    'user' => [
        'username' => $user['uidUsers'],
        'firstname' => $user['firstname'],
        'lastname' => $user['lastname'],
        'balance' => (float)$user['accountBalance'],
        'steamId' => $user['steamId'] ?? '',
        'discordId' => $user['discordId'] ?? ''
    ],
    'activities' => getRecentActivities($conn, $userId, 15)
]);
