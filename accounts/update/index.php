<?php
    $root = realpath($_SERVER["DOCUMENT_ROOT"]);
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    if (!isset($_SESSION['userId'])) {
        header("Location: ../");
        exit();
    }
    require $root.'/includes/inactivity.php';
    require $root.'/includes/variables.php';
    require $root.'/head.php';
    require $root.'/navbar.php';
    
    if (isset($_SESSION['userId'])) {
        echo '
        <script>
        var functionName = quizTimer();
        setInterval(function () {
            quizTimer();
        }, 1000);
        
        </script>';
    }
?>
    <body>
        <div id="innerHere"></div>
        <main class="profile-settings">
            <header class="profile-settings__header">
                <h1>Profile settings</h1>
                <p>Keep your Steam and Discord IDs up to date.</p>
            </header>
            <div class="profile-settings__grid">
                <section class="profile-card" aria-labelledby="platform-ids-heading">
                    <h2 id="platform-ids-heading">Platform IDs</h2>
                    <p class="profile-card__description">Your SteamID64 is also your account number.</p>
                    <form action="/includes/update.inc.php" method="post" class="profile-form">
                        <label for="steamid">SteamID64</label>
                        <input type="text" name="steamid" id="steamid" placeholder="17-digit SteamID64" aria-describedby="steamid-help" inputmode="numeric" autocomplete="off" pattern="[0-9]{17}" minlength="17" maxlength="17" value="<?php echo htmlspecialchars($userAccountNumber, ENT_QUOTES, 'UTF-8'); ?>" required>
                        <small id="steamid-help">Enter your 17-digit Steam account ID.</small>

                        <label for="discordid">Discord ID</label>
                        <input type="text" name="discordid" id="discordid" placeholder="17–20 digit Discord ID" aria-describedby="discordid-help" inputmode="numeric" autocomplete="off" pattern="[0-9]{17,20}" minlength="17" maxlength="20" value="<?php echo htmlspecialchars($userDiscordId, ENT_QUOTES, 'UTF-8'); ?>" required>
                        <small id="discordid-help">Enter your 17–20 digit Discord user ID.</small>

                        <?php
                            $profileErrors = [
                                'invalidsteamid' => 'SteamID64 must be exactly 17 digits.',
                                'steamidtaken' => 'That SteamID64 is already registered.',
                                'invaliddiscordid' => 'Discord ID must be 17 to 20 digits.',
                                'updatefailed' => 'Could not save your profile IDs. Please try again.'
                            ];
                            $profileError = $_GET['error'] ?? '';
                            if (is_string($profileError) && isset($profileErrors[$profileError])) {
                                echo '<p class="profile-message profile-message--error" role="alert">'.htmlspecialchars($profileErrors[$profileError], ENT_QUOTES, 'UTF-8').'</p>';
                            } else if (isset($_GET['profile']) && $_GET['profile'] === 'updated') {
                                echo '<p class="profile-message profile-message--success" role="status">Your IDs have been saved.</p>';
                            }
                        ?>
                        <button type="submit" name="profile-ids-submit">Save IDs</button>
                    </form>
                </section>

                <section class="profile-card" aria-labelledby="password-heading">
                    <h2 id="password-heading">Change password</h2>
                    <p class="profile-card__description">Choose a strong password you do not use elsewhere.</p>
                    <form action="/includes/update.inc.php" method="post" class="profile-form">
                        <label for="oldpassword">Current password</label>
                        <input type="password" name="oldpassword" id="oldpassword" autocomplete="current-password" required>
                        <label for="newpassword">New password</label>
                        <input type="password" name="newpassword" id="newpassword" autocomplete="new-password" required>
                        <label for="confirmpassword">Confirm new password</label>
                        <input type="password" name="confirmpassword" id="confirmpassword" autocomplete="new-password" required>
                        <button type="submit" name="update-submit">Update password</button>
                    </form>
                </section>
            </div>
        </main>
        </div>
        <?php
            require '../../footer.php';
        ?>
    </body>


</html>