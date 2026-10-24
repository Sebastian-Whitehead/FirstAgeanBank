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

function renderActivityTable(array $activities): void
{
    echo '<table style="width:100%">';
    echo '<tr class="checker"><th>Account</th><th>Date &amp; Time</th><th>Description</th><th>Amount</th></tr>';

    if ($activities === []) {
        echo '<tr><td colspan="4">No recent activity.</td></tr>';
    }

    foreach ($activities as $index => $activity) {
        $account = $activity['steamId'] ?? '';
        $account = $account !== '' ? $account : 'SteamID not set';
        $timestamp = new DateTimeImmutable($activity['created_at']);
        $positive = (bool)$activity['is_positive'];
        $amountSign = $positive ? '+$' : '-$';
        $rowClass = $index % 2 === 1 ? ' class="checker"' : '';

        echo '<tr'.$rowClass.'>';
        echo '<td>'.htmlspecialchars($account, ENT_QUOTES, 'UTF-8').'</td>';
        echo '<td><time datetime="'.htmlspecialchars($timestamp->format(DateTimeInterface::ATOM), ENT_QUOTES, 'UTF-8').'">'.htmlspecialchars($timestamp->format('m/d/Y g:i:s A'), ENT_QUOTES, 'UTF-8').'</time></td>';
        echo '<td>'.htmlspecialchars($activity['description'], ENT_QUOTES, 'UTF-8').'</td>';
        echo '<td class="'.($positive ? 'positive' : 'negative').'"><p>'.$amountSign.number_format((float)$activity['amount'], 2, '.', ',').'</p></td>';
        echo '</tr>';
    }

    echo '</table>';
}
