<?php

declare(strict_types=1);

namespace App\Models;

use Library\Database;
use Library\Exceptions\AuthenticationException;
use Library\Exceptions\DatabaseException;
use Library\Exceptions\ValidationException;

/**
 * Part 3: User Model — Lillia and Rowena Furniture
 * Maps to the MySQL `Customer` (CustomerID, FullName, Email, PasswordHash, PhoneNumber, Address)
 * and `Admin` (AdminID, Email, PasswordHash) tables defined in database/furniture.sql.
 */
class User
{
    private Database $db;

    /**
     * Default seeded accounts matching Customer and Admin tables in database/furniture.sql
     *
     * @var array<int, array<string, mixed>>
     */
    private const DEFAULT_ACCOUNTS = [
        [
            'id'           => 1,
            'role'         => 'Customer',
            'fullName'     => 'Clara Vance',
            'email'        => 'clara.vance@architects.io',
            'passwordPlain'=> 'ClientPass2025!',
            'phoneNumber'  => '+1 (212) 555-0148',
            'address'      => '412 Mercer St, Penthouse B, New York, NY 10013',
        ],
        [
            'id'           => 2,
            'role'         => 'Customer',
            'fullName'     => 'Julian Thorne',
            'email'        => 'j.thorne@studio-thorne.com',
            'passwordPlain'=> 'ClientPass2025!',
            'phoneNumber'  => '+1 (415) 555-0193',
            'address'      => '88 Pacific Ave, San Francisco, CA 94111',
        ],
        [
            'id'           => 1,
            'role'         => 'Admin',
            'fullName'     => 'Lillia Mercier (Business Owner)',
            'email'        => 'admin@lilliarowena.com',
            'passwordPlain'=> 'MasterJoinery#01',
            'phoneNumber'  => '+1 (212) 555-0100',
            'address'      => 'Lillia and Rowena Furniture Showroom, New York',
        ],
    ];

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    /**
     * Validate login input fields and throw ValidationException if invalid.
     *
     * @throws ValidationException
     */
    public function validateCredentials(string $email, string $password): void
    {
        $errors = [];
        $trimmedEmail = trim($email);

        if ($trimmedEmail === '') {
            $errors['email'] = 'Email address is required.';
        } elseif (!filter_var($trimmedEmail, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Please enter a valid email address.';
        }

        if ($password === '') {
            $errors['password'] = 'Password is required.';
        } elseif (strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters.';
        }

        if (!empty($errors)) {
            throw new ValidationException(reset($errors), $errors);
        }
    }

    /**
     * Authenticate a Customer or Admin by email and password.
     *
     * @return array<string, mixed>
     * @throws ValidationException
     * @throws AuthenticationException
     * @throws DatabaseException
     */
    public function authenticate(string $email, string $password, ?string $expectedRole = null): array
    {
        $this->validateCredentials($email, $password);
        $normalizedEmail = strtolower(trim($email));

        $user = $this->findByEmail($normalizedEmail, $expectedRole);
        if ($user === null) {
            throw new AuthenticationException('No account found with that email address.');
        }

        $storedHash = (string) ($user['passwordHash'] ?? '');
        $plainFallback = (string) ($user['passwordPlain'] ?? '');

        $verified = false;
        if ($storedHash !== '' && password_verify($password, $storedHash)) {
            $verified = true;
        } elseif ($plainFallback !== '' && hash_equals($plainFallback, $password)) {
            $verified = true;
        }

        if (!$verified) {
            throw new AuthenticationException('Incorrect password for ' . $normalizedEmail . '.');
        }

        unset($user['passwordHash'], $user['passwordPlain']);
        return $user;
    }

    /**
     * Find a user in `Admin` or `Customer` table by email.
     *
     * @return array<string, mixed>|null
     * @throws DatabaseException
     */
    public function findByEmail(string $email, ?string $role = null): ?array
    {
        $normalizedEmail = strtolower(trim($email));

        if ($this->db->isMySqlConnected()) {
            if ($role === null || strcasecmp($role, 'Admin') === 0) {
                $adminRow = $this->db->fetch(
                    'SELECT AdminID AS id, Email AS email, PasswordHash AS passwordHash FROM Admin WHERE LOWER(Email) = :email LIMIT 1',
                    [':email' => $normalizedEmail]
                );
                if ($adminRow !== null) {
                    $adminRow['role'] = 'Admin';
                    $adminRow['fullName'] = 'Lillia Mercier (Admin)';
                    return $adminRow;
                }
            }

            if ($role === null || strcasecmp($role, 'Customer') === 0) {
                $customerRow = $this->db->fetch(
                    'SELECT CustomerID AS id, FullName AS fullName, Email AS email, PasswordHash AS passwordHash, PhoneNumber AS phoneNumber, Address AS address
                     FROM Customer WHERE LOWER(Email) = :email LIMIT 1',
                    [':email' => $normalizedEmail]
                );
                if ($customerRow !== null) {
                    $customerRow['role'] = 'Customer';
                    return $customerRow;
                }
            }
        }

        // JSON datastore + seeded accounts lookup
        $accounts = $this->getAllSeedAndStoreUsers();
        foreach ($accounts as $account) {
            if (strtolower((string) $account['email']) === $normalizedEmail) {
                if ($role !== null && strcasecmp((string) $account['role'], $role) !== 0) {
                    continue;
                }
                return $account;
            }
        }

        return null;
    }

    /**
     * Register a new Customer in the `Customer` table (or JSON store fallback).
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     * @throws ValidationException
     * @throws DatabaseException
     */
    public function register(array $data): array
    {
        $fullName = trim((string) ($data['fullName'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');
        $phoneNumber = trim((string) ($data['phoneNumber'] ?? ''));
        $address = trim((string) ($data['address'] ?? ''));

        $errors = [];
        if ($fullName === '') {
            $errors['fullName'] = 'Full name is required.';
        }
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'A valid email address is required.';
        }
        if (strlen($password) < 6) {
            $errors['password'] = 'Password must be at least 6 characters.';
        }

        if (!empty($errors)) {
            throw new ValidationException(reset($errors), $errors);
        }

        if ($this->findByEmail($email) !== null) {
            throw new ValidationException('An account with this email already exists.', [
                'email' => 'An account with this email already exists.',
            ]);
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        if ($this->db->isMySqlConnected()) {
            $this->db->query(
                'INSERT INTO Customer (FullName, Email, PasswordHash, PhoneNumber, Address)
                 VALUES (:name, :email, :hash, :phone, :addr)',
                [
                    ':name'  => $fullName,
                    ':email' => $email,
                    ':hash'  => $passwordHash,
                    ':phone' => $phoneNumber ?: null,
                    ':addr'  => $address ?: null,
                ]
            );
            $pdo = $this->db->getConnection();
            $customerId = $pdo ? (int) $pdo->lastInsertId() : 100;
        } else {
            $store = $this->db->readStore();
            $customers = isset($store['customers']) && is_array($store['customers']) ? $store['customers'] : [];
            $customerId = count($customers) + 10;
            $newCustomer = [
                'id'           => $customerId,
                'role'         => 'Customer',
                'fullName'     => $fullName,
                'email'        => $email,
                'passwordHash' => $passwordHash,
                'phoneNumber'  => $phoneNumber,
                'address'      => $address,
            ];
            $customers[] = $newCustomer;
            $store['customers'] = $customers;
            $this->db->writeStore($store);
        }

        return [
            'id'          => $customerId,
            'role'        => 'Customer',
            'fullName'    => $fullName,
            'email'       => $email,
            'phoneNumber' => $phoneNumber,
            'address'     => $address,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getAllSeedAndStoreUsers(): array
    {
        $users = [];
        foreach (self::DEFAULT_ACCOUNTS as $acc) {
            $acc['passwordHash'] = password_hash((string) $acc['passwordPlain'], PASSWORD_DEFAULT);
            $users[] = $acc;
        }

        try {
            $store = $this->db->readStore();
            if (isset($store['customers']) && is_array($store['customers'])) {
                foreach ($store['customers'] as $customUser) {
                    if (is_array($customUser)) {
                        $users[] = $customUser;
                    }
                }
            }
        } catch (DatabaseException) {
            // Ignore if store file not initialized yet
        }

        return $users;
    }
}
