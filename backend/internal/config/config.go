package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	DatabaseURL        string   `mapstructure:"DATABASE_URL"`
	RedisURL           string   `mapstructure:"REDIS_URL"`
	JWTSecret          string   `mapstructure:"JWT_SECRET"`
	Port               string   `mapstructure:"PORT"`
	MinioEndpoint      string   `mapstructure:"MINIO_ENDPOINT"`
	MinioAccessKey     string   `mapstructure:"MINIO_ACCESS_KEY"`
	MinioSecretKey     string   `mapstructure:"MINIO_SECRET_KEY"`
	MinioBucket        string   `mapstructure:"MINIO_BUCKET"`
	MinioUseSSL        bool     `mapstructure:"MINIO_USE_SSL"`
	EmailProvider      string   `mapstructure:"EMAIL_PROVIDER"`
	ResendAPIKey       string   `mapstructure:"RESEND_API_KEY"`
	SMTPHost           string   `mapstructure:"SMTP_HOST"`
	SMTPPort           int      `mapstructure:"SMTP_PORT"`
	SMTPUser           string   `mapstructure:"SMTP_USER"`
	SMTPPass           string   `mapstructure:"SMTP_PASS"`
	EmailFrom          string   `mapstructure:"EMAIL_FROM"`
	EmailFromName      string   `mapstructure:"EMAIL_FROM_NAME"`
	CORSAllowedOrigins []string `mapstructure:"CORS_ALLOWED_ORIGINS"`
	MaxUploadSize      int64    `mapstructure:"MAX_UPLOAD_SIZE"`
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()
	viper.ReadInConfig()

	viper.SetDefault("PORT", "8080")
	viper.SetDefault("EMAIL_PROVIDER", "smtp")
	viper.SetDefault("MAX_UPLOAD_SIZE", 10485760) // 10MB

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}
	return &config, nil
}
