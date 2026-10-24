
        <div class="nb no-print">
            <div class="nb_top_logo">
                <img src="/assets/png/first-agean-bank.png" width="50" alt="First Agean Bank logo">
                <h1>First Agean <span class="bank-text">Bank</span></h1>
                    <?php
                        if (isset($_SESSION['userId'])) {
                            echo "<a href='/accounts/update/'>".$_SESSION['firstname']." ";
                            echo $_SESSION['lastname']."</p>";
                        } else {
                            echo ' ';
                        }
                    ?>
            </div>
            <div class="list">
                <ul>
                    <li><a href="/">Home</a></li>
                    <?php
                        if (isset($_SESSION['userId'])) {
                            echo '
                            <li><a href="/accounts">Accounts</a></li>
                            <li><a href="/transfer">Transfer</a></li>
                            <li><a href="/activities">Activities</a></li>
                            <li><a href="/includes/logout.inc.php">Logout</a></li>
                            ';
                        } else {
                            echo '
                    <li><a href="/#fraud">Fraud Awareness</a></li>
                    <li><a href="/#banks">Three Islands</a></li>
                    <li><a href="/signup">Join Us</a></li>
                    ';
                        }
                    ?>
                </ul>
            </div>
        </div>