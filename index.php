<?php
        $root = realpath($_SERVER["DOCUMENT_ROOT"]);
        include('head.php');
        require $root.'/includes/inactivity.php';
    ?>
    <body>
        <?php 
        if (isset($_GET['timeout'])) {
            if (!isset($_SESSION['userId'])) {
                
            }
        }
    
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
        <video autoplay muted loop id="myVideo">
            <source src="/assets/mp4/production%20ID_3771136.mp4" type="video/mp4">
        </video>
        <?php
            include('login.php');
        ?>
        <?php
            include('navbar.php');
        ?>
        <div class="welcome">
            <h1>Welcome<?php
                if (isset($_SESSION['userId'])) {
                    echo ' back ';
                } else {
                    echo ' ';
                }
                ?>to First Agean Bank<?php
                if (isset($_SESSION['userId'])) {
                    echo ', '.$_SESSION['userUid'];
                } else {
                    echo ' ';
                }
                
                ?></h1>
            <p>One federation. Three islands. A brighter future across the Agean Sea.</p>
        </div>
        <div id="innerHere"></div>
        <div class="page">
        <div class="about section">
            <div class="about-content content">
                <h1>A Federation Connected by the Sea</h1>
                <p>From the sunlit harbors of Altis to the quiet hills of Stratis and the rugged shores of Malden, our islands share one future. The Agean Federation was founded on a simple promise: every island, every community, and every generation deserves a place in our common story. First Agean Bank is proud to help keep that promise moving, one neighbor and one voyage at a time.</p>
            </div>
        </div>
        <div class="account-options section" id="accounts">
            <div class="account-content content">
                <h1>Official Federation Prosperity Figures</h1>
                <div class="prices"><h2>Islandwide Prosperity</h2><h3>128%</h3><p>So prosperous, we found an extra 28% prosperity.</p></div>
                <div class="prices"><h2>Harbor Efficiency</h2><h3>1,000%</h3><p>Ten times more efficient than a perfectly efficient harbor.</p></div>
                <div class="prices"><h2>Federation Unity</h2><h3>300%</h3><p>One hundred percent for each of our three united islands.</p></div>
                <p>Figures are official, mathematically enthusiastic, and absolutely not exaggerated.</p>
            </div>
        </div>
        <div class="other-info section" id="fraud">
            <div class="other-content content">
                <h1>Keep Your Account in Safe Harbor</h1>
                <p>Your account is yours alone. Never share your password or one-time codes with anyone, even someone claiming to call from the bank. First Agean Bank will never ask you to pay a fee with gift cards or send money to “protect” your balance. If a request feels suspicious, pause and contact your local branch through the details on this site.</p>
            </div>
        </div>
        <div class="affiliated-banks section" id="banks">
            <div class="affiliated-content content">
                <h1>Three Islands, One Federation</h1>
                <div class="island-grid">
                    <article class="island-card">
                        <img src="/assets/png/altis-silhouette.png" alt="Silhouette of Altis island" width="96" height="96">
                        <h2>Altis</h2>
                        <p>Our largest island: a lively capital, busy harbors, and the heart of Federation trade.</p>
                    </article>
                    <article class="island-card">
                        <img src="/assets/png/stratis-silhouette.png" alt="Silhouette of Stratis island" width="96" height="96">
                        <h2>Stratis</h2>
                        <p>A close-knit island where clear waters, close neighbors, and a proud maritime tradition meet.</p>
                    </article>
                    <article class="island-card island-card-malden">
                        <img src="/assets/png/malden-silhouette.png" alt="Silhouette of Malden island" width="96" height="96">
                        <h2>Malden</h2>
                        <p>Known for its rugged coastline, hillside villages, and resilient island communities.</p>
                    </article>
                </div>
            </div>
        </div>
        </div>
        <?php
            require 'footer.php';
        ?>
    </body>
</html>