<?php
    $root = realpath($_SERVER["DOCUMENT_ROOT"]);
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (!isset($_SESSION['userId'])) {
        header("Location: ../");
        exit();
    }

    require $root.'/includes/dbh.inc.php';
    require $root.'/includes/inactivity.php';
    require $root.'/includes/variables.php';
    require $root.'/includes/activity-table.inc.php';
    $recentActivities = getRecentActivities($conn, (int)$_SESSION['userId'], 5);
    require $root.'/head.php';
    require $root.'/navbar.php';

    $settingsJson = file_get_contents($root.'/setup.json');
    if ($settingsJson === false) {
        error_log("Unable to load site settings.");
        http_response_code(500);
        exit("Unable to load account page.");
    }
    $settings = json_decode(trim($settingsJson, "\xEF\xBB\xBF"), true);
    if (!is_array($settings)) {
        error_log("Site settings contain invalid JSON.");
        http_response_code(500);
        exit("Unable to load account page.");
    }
?>
<script>
    setInterval(quizTimer, 1000);
</script>
<body>
    <?php if (!empty($settings['overlay'])): ?>
        <div class="overlay"></div>
    <?php endif; ?>
    <div class="innerHere">
        <div class="user-info">
            <div class="userdis">
                <h3>Accounts</h3>
                <table style="width:100%" class="accounts-table">
                    <tr class="checker">
                        <th>Type</th>
                        <th>Account Number</th>
                        <th>Available Balance</th>
                        <th></th>
                    </tr>
                    <tr>
                        <td>Personal Account</td>
                        <td><?php echo htmlspecialchars($userAccountNumber !== '' ? $userAccountNumber : 'Set SteamID in profile', ENT_QUOTES, 'UTF-8'); ?></td>
                        <td><?php
                            if ($userBalance < 0) {
                                echo '-';
                            }
                            echo '$'.number_format(abs((float)$userBalance), 2, '.', ',');
                        ?></td>
                        <td><a href="/transfer/">Transfer</a></td>
                    </tr>
                </table>

                <h3>Recent Activities</h3>
                <?php renderActivityTable($recentActivities); ?>
                <div class="after-content">
                    <?php if (!empty($settings['downloadButton'])): ?>
                        <a class="download" href="<?php echo htmlspecialchars($settings['downloadFileLink'], ENT_QUOTES, 'UTF-8'); ?>" target="_blank" download>
                            <?php echo htmlspecialchars($settings['downloadButtonText'], ENT_QUOTES, 'UTF-8'); ?>
                        </a>
                    <?php endif; ?>
                    <p class="load" style="margin-bottom: 100px;"><a href="/activities/">Load More</a></p>
                </div>
            </div>
        </div>
    </div>
    <?php require '../footer.php'; ?>
</body>
</html>
