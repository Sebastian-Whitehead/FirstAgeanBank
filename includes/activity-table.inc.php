<?php
function getRecentActivities(mysqli $conn, int $userId, int $limit): array
{
    $stmt = mysqli_prepare(
        $conn,
        "SELECT users.steamId, activities.created_at, activities.description, activities.amount, activities.is_positive
         FROM account_activities AS activities
         JOIN users ON users.idUsers=activities.user_id
         WHERE activities.user_id=?
         ORDER BY activities.id DESC
         LIMIT ?"
    );
    if (!$stmt) {
        error_log("Unable to prepare recent activities query: ".mysqli_error($conn));
        http_response_code(500);
        exit("Unable to load recent activities.");
    }

    mysqli_stmt_bind_param($stmt, "ii", $userId, $limit);
    if (!mysqli_stmt_execute($stmt)) {
        error_log("Unable to query recent activities: ".mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        http_response_code(500);
        exit("Unable to load recent activities.");
    }

    $result = mysqli_stmt_get_result($stmt);
    if ($result === false) {
        error_log("Unable to read recent activities: ".mysqli_stmt_error($stmt));
        mysqli_stmt_close($stmt);
        http_response_code(500);
        exit("Unable to load recent activities.");
    }

    $activities = mysqli_fetch_all($result, MYSQLI_ASSOC);
    mysqli_stmt_close($stmt);
    return $activities;
}
