<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit();
}

require __DIR__.'/../../includes/dbh.inc.php';

$userLookup = mysqli_prepare($conn, "SELECT idUsers FROM users WHERE uidUsers=?");
$activityInsert = mysqli_prepare(
    $conn,
    "INSERT IGNORE INTO account_activities (user_id, description, amount, is_positive, created_at, legacy_key) VALUES (?, ?, ?, ?, ?, ?)"
);
if (!$userLookup || !$activityInsert) {
    throw new RuntimeException("Unable to prepare legacy activity import statements.");
}

$files = glob(__DIR__.'/../../assets/users/*.json');
if ($files === false) {
    throw new RuntimeException("Unable to list legacy activity files.");
}

$imported = 0;
foreach ($files as $file) {
    $username = basename($file, '.json');
    if (!preg_match('/^[a-zA-Z0-9]+$/', $username)) {
        fwrite(STDERR, "Skipping activity file with an invalid username: ".basename($file).PHP_EOL);
        continue;
    }

    mysqli_stmt_bind_param($userLookup, "s", $username);
    if (!mysqli_stmt_execute($userLookup)) {
        throw new RuntimeException("Unable to find user for legacy activity file: ".$username);
    }
    $userResult = mysqli_stmt_get_result($userLookup);
    $user = mysqli_fetch_assoc($userResult);
    if ($user === null) {
        fwrite(STDERR, "Skipping activity file without a matching user: ".$username.PHP_EOL);
        continue;
    }

    $contents = file_get_contents($file);
    if ($contents === false) {
        throw new RuntimeException("Unable to read legacy activity file: ".$username);
    }
    $activities = json_decode(trim($contents, "\xEF\xBB\xBF"), true);
    if (!is_array($activities)) {
        throw new RuntimeException("Invalid JSON in legacy activity file: ".$username);
    }

    $userId = (int)$user['idUsers'];
    foreach ($activities as $index => $activity) {
        if (
            !is_array($activity)
            || !isset($activity['desc'], $activity['amount'], $activity['positive'], $activity['date'], $activity['year'])
            || !is_string($activity['desc'])
            || !is_numeric($activity['amount'])
            || !preg_match('/^[0-9]{2}\/[0-9]{2}$/', $activity['date'])
            || !preg_match('/^[0-9]{4}$/', (string)$activity['year'])
        ) {
            throw new RuntimeException("Invalid activity entry in legacy file: ".$username);
        }

        $date = DateTimeImmutable::createFromFormat('!m/d/Y', $activity['date'].'/'.$activity['year']);
        $dateErrors = DateTimeImmutable::getLastErrors();
        if (
            $date === false
            || ($dateErrors !== false && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
        ) {
            throw new RuntimeException("Invalid activity date in legacy file: ".$username);
        }

        $description = $activity['desc'];
        $amount = (float)$activity['amount'];
        $isPositive = (int)(bool)$activity['positive'];
        $createdAt = $date->format('Y-m-d H:i:s');
        $legacyKey = $username.':'.$index;
        mysqli_stmt_bind_param($activityInsert, "isdiss", $userId, $description, $amount, $isPositive, $createdAt, $legacyKey);
        if (!mysqli_stmt_execute($activityInsert)) {
            throw new RuntimeException("Unable to import activity entry for user: ".$username);
        }
        $imported += mysqli_stmt_affected_rows($activityInsert);
    }
}

mysqli_stmt_close($userLookup);
mysqli_stmt_close($activityInsert);
mysqli_close($conn);
fwrite(STDOUT, "Imported ".$imported." legacy activity entries.".PHP_EOL);
