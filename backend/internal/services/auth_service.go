package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/hireflow/hireflow/backend/internal/config"
	"github.com/hireflow/hireflow/backend/internal/models"
)

type AuthService struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	cfg *config.Config
}

func NewAuthService(db *pgxpool.Pool, rdb *redis.Client, cfg *config.Config) *AuthService {
	return &AuthService{db: db, rdb: rdb, cfg: cfg}
}

func slugify(s string) string {
	return strings.ToLower(strings.ReplaceAll(s, " ", "-"))
}

func (s *AuthService) Register(ctx context.Context, companyName, email, password, fullName string) (*models.User, string, string, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, "", "", fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	slug := slugify(companyName)
	var companyID uuid.UUID
	err = tx.QueryRow(ctx, "INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING id", companyName, slug).Scan(&companyID)
	if err != nil {
		return nil, "", "", fmt.Errorf("insert company: %w", err)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, "", "", fmt.Errorf("hash password: %w", err)
	}

	var user models.User
	err = tx.QueryRow(ctx, `
		INSERT INTO users (company_id, email, password_hash, full_name, role)
		VALUES ($1, $2, $3, $4, 'admin')
		RETURNING id, company_id, email, full_name, role, created_at, updated_at
	`, companyID, email, string(hash), fullName).Scan(
		&user.ID, &user.CompanyID, &user.Email, &user.FullName, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, "", "", fmt.Errorf("insert user: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, "", "", fmt.Errorf("commit tx: %w", err)
	}

	accessToken, refreshToken, err := s.generateTokens(ctx, user.ID.String(), user.CompanyID.String())
	if err != nil {
		return nil, "", "", err
	}

	return &user, accessToken, refreshToken, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (*models.User, string, string, error) {
	var user models.User
	err := s.db.QueryRow(ctx, `
		SELECT id, company_id, email, password_hash, full_name, role, created_at, updated_at
		FROM users WHERE email = $1
	`, email).Scan(
		&user.ID, &user.CompanyID, &user.Email, &user.PasswordHash, &user.FullName, &user.Role, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, "", "", fmt.Errorf("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, "", "", fmt.Errorf("invalid credentials")
	}

	accessToken, refreshToken, err := s.generateTokens(ctx, user.ID.String(), user.CompanyID.String())
	if err != nil {
		return nil, "", "", err
	}

	return &user, accessToken, refreshToken, nil
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (string, string, error) {
	userID, err := s.rdb.Get(ctx, fmt.Sprintf("refresh:%s", refreshToken)).Result()
	if err != nil {
		return "", "", fmt.Errorf("invalid refresh token: %w", err)
	}

	s.rdb.Del(ctx, fmt.Sprintf("refresh:%s", refreshToken))

	var companyID string
	err = s.db.QueryRow(ctx, "SELECT company_id FROM users WHERE id = $1", userID).Scan(&companyID)
	if err != nil {
		return "", "", fmt.Errorf("user not found: %w", err)
	}

	return s.generateTokens(ctx, userID, companyID)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	if err := s.rdb.Del(ctx, fmt.Sprintf("refresh:%s", refreshToken)).Err(); err != nil {
		return fmt.Errorf("failed to delete refresh token: %w", err)
	}
	return nil
}

func (s *AuthService) generateTokens(ctx context.Context, userID, companyID string) (string, string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":    userID,
		"company_id": companyID,
		"exp":        time.Now().Add(15 * time.Minute).Unix(),
	})
	accessToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", "", fmt.Errorf("sign access token: %w", err)
	}

	b := make([]byte, 32)
	rand.Read(b)
	refreshToken := hex.EncodeToString(b)

	err = s.rdb.Set(ctx, fmt.Sprintf("refresh:%s", refreshToken), userID, 7*24*time.Hour).Err()
	if err != nil {
		return "", "", fmt.Errorf("store refresh token: %w", err)
	}

	return accessToken, refreshToken, nil
}
