CREATE TABLE IF NOT EXISTS account_activities (
  id BIGINT(20) NOT NULL AUTO_INCREMENT,
  user_id INT(11) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  is_positive TINYINT(1) NOT NULL,
  created_at DATETIME NOT NULL,
  legacy_key VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY unique_legacy_activity (legacy_key),
  KEY account_activities_user_id_id (user_id, id),
  CONSTRAINT account_activities_user_fk FOREIGN KEY (user_id) REFERENCES users (idUsers) ON DELETE CASCADE
);
