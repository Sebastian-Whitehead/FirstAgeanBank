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

CREATE TABLE `account_activities` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  `is_positive` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `legacy_key` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_legacy_activity` (`legacy_key`),
  KEY `account_activities_user_id_id` (`user_id`, `id`),
  CONSTRAINT `account_activities_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`idUsers`) ON DELETE CASCADE
);
