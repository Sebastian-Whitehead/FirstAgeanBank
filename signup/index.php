<?php
    include("../head.php");
?>
<?php
    include('../navbar.php');
    if (isset($_SESSION['userId'])) {
        header("Location: ../index.php");
        exit();
    } else {
        
    }
?>

<head>
    <script src="/assets/js/main.js"></script>
</head>
<div class="signup-div">
    <form action="/includes/signup.inc.php" method="post" class="signupform">
        <h1>Signup</h1>
        <input type="text" name="firstname" id="firstname" placeholder="firstname" maxlength="35" value="<?php
            if (isset($_GET['error'])) {
                if ($_GET['error'] == "invalidmail") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "emptyfields") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "passwordCheck") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "passlength") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "passlength") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "uidtaken") {
                    echo $_GET['firstname'];
                } else if ($_GET['error'] == "invaliduid") {
                    echo $_GET['firstname'];
                }
            }
        ?>">
        <input type="text" name="lastname" id="lastname" placeholder="lastname" maxlength="35" value="<?php
            if (isset($_GET['error'])) {
                if ($_GET['error'] == "invalidmail") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "emptyfields") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "passwordCheck") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "passlength") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "passlength") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "uidtaken") {
                    echo $_GET['lastname'];
                } else if ($_GET['error'] == "invaliduid") {
                    echo $_GET['lastname'];
                }
            }
        ?>">
        <?php
        if (isset($_GET['error'])) {
            if ($_GET['error'] == "characterlimit") {
                echo '<p class="ins-funds">Your name exceeds the character limit. Abbreviate your name if needed.</p>';
            }
        }
        ?>
        <input type="text" name="uid" id="username" placeholder="username" value="<?php
            if (isset($_GET['error'])) {
                if ($_GET['error'] == "invalidmail") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "emptyfields") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "passwordCheck") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "emailtaken") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "characterlimit") {
                    echo $_GET['uid'];
                } else if ($_GET['error'] == "passlength") {
                    echo $_GET['uid'];
                }
            }
        ?>">
        <?php
        if (isset($_GET['error'])) {
            if ($_GET['error'] == "invaliduid") {
                echo '<p class="ins-funds">Invalid username</p>';
            } else if ($_GET['error'] == "uidtaken") {
                echo '<p class="ins-funds">This username has been taken</p>';
            }
        }
        ?>
        <input type="hidden" name="mail" value="<?php echo htmlspecialchars(uniqid('signup-', true).'@example.invalid', ENT_QUOTES, 'UTF-8'); ?>">
        <input type="password" name="pwd" id="password" placeholder="password" min="6">
        <input type="password" name="pwd-repeat" id="password-repeat" placeholder="retype password">
        <div class="reveal" onclick="reveal()">
            <img src="/assets/png/visibility-black-18dp/1x/outline_visibility_black_18dp.png" class="material-icons" id="reveal-icon">
        </div>
        <?php
        if (isset($_GET['error'])) {
            if ($_GET['error'] == "emptyfields") {
                echo '<p class="ins-funds">Please fill in the fields</p>';
            } else if ($_GET['error'] == "signupfailed") {
                echo '<p class="ins-funds">Signup could not be completed. Please try again.</p>';
            } else if ($_GET['error'] == "passwordcheck") {
                echo '<p class="ins-funds">Passwords do not match</p>';
            } else if ($_GET['error'] == "weakpass") {
                echo '<p class="ins-funds">Password is too weak, use symbols, and uppercase, lowercase letters</p>';
            } else if ($_GET['error'] == "passlength") {
                echo '<p class="ins-funds">Password is too short (enter at least 6 characters)</p>';
            }
        }
        ?>
        <div class="signup-platform-ids">
            <input type="text" name="steamid" id="steamid" placeholder="SteamID64 (17 digits)" aria-label="SteamID64 (17 digits)" inputmode="numeric" pattern="[0-9]{17}" minlength="17" maxlength="17" required>
            <?php
            if (isset($_GET['error']) && $_GET['error'] == "invalidsteamid") {
                echo '<p class="ins-funds">SteamID must be exactly 17 digits</p>';
            } else if (isset($_GET['error']) && $_GET['error'] == "steamidtaken") {
                echo '<p class="ins-funds">This SteamID is already registered</p>';
            }
            ?>
            <input type="text" name="discordid" id="discordid" placeholder="Discord ID (17-20 digits)" aria-label="Discord ID (17-20 digits)" inputmode="numeric" pattern="[0-9]{17,20}" minlength="17" maxlength="20" required>
            <?php
            if (isset($_GET['error']) && $_GET['error'] == "invaliddiscordid") {
                echo '<p class="ins-funds">Discord ID must be 17 to 20 digits</p>';
            }
            ?>
        </div>
        <button type="submit" name="signup-submit" id="log-in">Sign Up</button>
    </form>
</div>
        <?php
            require '../footer.php';
        ?>