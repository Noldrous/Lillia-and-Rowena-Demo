<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Product;
use App\Models\User;
use Library\Database;
use Library\Exceptions\AuthenticationException;
use Library\Exceptions\DatabaseException;
use Library\Exceptions\ValidationException;

/**
 * Part 4: HomeControllers
 * Handles Login, Logout, Welcome/Showroom view rendering, and JSON API actions
 * for Lillia and Rowena Furniture.
 */
class HomeControllers
{
    private Database $db;
    private User $userModel;
    private Product $productModel;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
        $this->userModel = new User($this->db);
        $this->productModel = new Product($this->db);
    }

    /**
     * Render or process the Login page (`index.php` -> `views/login.php`).
     */
    public function login(): void
    {
        $error = null;
        $fieldErrors = [];
        $email = '';
        $role = 'Customer';

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
            $email = trim((string) ($_POST['email'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');
            $role = trim((string) ($_POST['role'] ?? 'Customer'));
            $isAjax = !empty($_SERVER['HTTP_X_REQUESTED_WITH'])
                || str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');

            try {
                $authenticatedUser = $this->userModel->authenticate($email, $password, $role);
                $_SESSION['user'] = $authenticatedUser;

                if ($isAjax) {
                    jsonResponse([
                        'ok'       => true,
                        'user'     => $authenticatedUser,
                        'redirect' => 'home.php',
                    ]);
                }

                redirect('home.php');
            } catch (ValidationException $e) {
                $error = $e->getMessage();
                $fieldErrors = $e->getErrors();
                if ($isAjax) {
                    jsonResponse([
                        'ok'     => false,
                        'error'  => $error,
                        'errors' => $fieldErrors,
                    ], 422);
                }
            } catch (AuthenticationException $e) {
                $error = $e->getMessage();
                if ($isAjax) {
                    jsonResponse([
                        'ok'    => false,
                        'error' => $error,
                    ], 401);
                }
            } catch (DatabaseException $e) {
                $error = $e->getMessage();
                if ($isAjax) {
                    jsonResponse([
                        'ok'    => false,
                        'error' => $error,
                    ], 500);
                }
            }
        }

        $store = $this->db->readStore();
        require dirname(__DIR__, 2) . '/views/login.php';
    }

    /**
     * Render the Welcome / Flagship Showroom & Order Management page (`home.php` -> `views/home.php`).
     */
    public function home(): void
    {
        $user = currentUser();
        $store = $this->db->readStore();
        $products = $this->productModel->getAll();
        require dirname(__DIR__, 2) . '/views/home.php';
    }

    /**
     * Clear the current user session and redirect to `index.php`.
     */
    public function logout(): never
    {
        $_SESSION = [];
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_destroy();
        }
        redirect('index.php');
    }
}
