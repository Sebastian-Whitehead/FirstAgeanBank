CREATE TABLE `users` (
  `idUsers` int(11) NOT NULL AUTO_INCREMENT,
  `uidUsers` tinytext NOT NULL,
  `emailUsers` tinytext NOT NULL,
  `pwdUsers` longtext NOT NULL,
  `firstname` text NOT NULL,
  `lastname` text NOT NULL,
  `accountBalance` decimal(18,2) NOT NULL DEFAULT 500.00,
  `steamId` char(17) DEFAULT NULL,
  `discordId` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`idUsers`),
  UNIQUE KEY `unique_steam_id` (`steamId`)
);
