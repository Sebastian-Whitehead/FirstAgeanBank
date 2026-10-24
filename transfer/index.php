<?php
    session_start();
    if (!isset($_SESSION['userId'])) {
        header("Location: ../");
        exit();
    }
    $root = realpath($_SERVER["DOCUMENT_ROOT"]);
    require $root.'/includes/inactivity.php';
    require $root.'/head.php';
    require $root.'/includes/variables.php';
    require $root.'/navbar.php';
?>
<div id="innerHere"></div>
<div class="user-info">
    <div class="userdis transferdiv">
        <h3>Send a Transfer</h3>
        <form action="/includes/transfer.inc.php" method="post" class="transferform">
            <table style="width:100%; margin-bottom: 100px;" class="transfertable">
                <tr>
                    <th>From</th>
                    <th>Recipient SteamID64</th>
                    <th>Amount ($)</th>
                </tr>
                <tr>
                    <td>
                        <?php
                            echo htmlspecialchars($userAccountNumber !== '' ? $userAccountNumber : 'SteamID not set', ENT_QUOTES, 'UTF-8');
                            echo ' ($'.number_format((float)$userBalance, 2, '.', ',').')';
                        ?>
                    </td>
                    <td>
                        <input
                            name="destinationAccountNumber"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]{17}"
                            minlength="17"
                            maxlength="17"
                            placeholder="17-digit SteamID64"
                            aria-label="Recipient SteamID64"
                            required
                        >
                    </td>
                    <td>
                        <input name="amount" type="number" placeholder="amount" min="0.01" max="5000" required step="0.01">
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <?php
                            $errors = [
                                'invalidsteamid' => 'Enter a valid 17-digit recipient SteamID.',
                                'steamidrequired' => 'Set your SteamID in your profile before sending a transfer.',
                                'invalidaccounts' => 'You cannot transfer to your own account.',
                                'recipientnotfound' => 'No account was found for that SteamID.',
                                'invalidamount' => 'Enter a valid transfer amount.',
                                'limitreached' => 'The maximum transfer is $5,000.00.',
                                'insufficientfunds' => 'Insufficient funds.',
                                'historyfailed' => 'The transfer could not be completed because transaction history could not be saved.',
                                'transferfailed' => 'The transfer could not be completed. Please try again.'
                            ];
                            if (isset($_GET['error']) && isset($errors[$_GET['error']])) {
                                echo '<p class="ins-funds">'.htmlspecialchars($errors[$_GET['error']], ENT_QUOTES, 'UTF-8').'</p>';
                            }
                        ?>
                    </td>
                    <td><button type="submit" name="transfer-submit" id="transferbtn">Send</button></td>
                </tr>
            </table>
        </form>
        <?php if ($userAccountNumber === ''): ?>
            <p class="ins-funds">Add your SteamID on the <a href="/accounts/update/">profile page</a> to use transfers.</p>
        <?php endif; ?>
    </div>
</div>
<?php require '../footer.php'; ?>
