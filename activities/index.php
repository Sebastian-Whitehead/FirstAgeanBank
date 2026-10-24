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
    $recentActivities = getRecentActivities($conn, (int)$_SESSION['userId'], 15);
    require $root.'/head.php';
    require $root.'/navbar.php';
?>
<script>
    setInterval(quizTimer, 1000);
</script>
<div id="innerHere"></div>
<div class="user-info">
    <div class="userdis">
        <h3>Recent Activities</h3>
        <?php renderActivityTable($recentActivities); ?>
    </div>
</div>
<?php require '../footer.php'; ?>
</body>
</html>
