<?php

declare(strict_types=1);

namespace Library\Exceptions;

use Exception;
use Throwable;

/**
 * Thrown when Customer or Admin authentication fails (invalid email, wrong password, or unauthorized session).
 */
class AuthenticationException extends Exception
{
    public function __construct(
        string $message = 'Invalid email address or password.',
        int $code = 401,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }
}
