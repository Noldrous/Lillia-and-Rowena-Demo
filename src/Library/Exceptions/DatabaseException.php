<?php

declare(strict_types=1);

namespace Library\Exceptions;

use Exception;
use Throwable;

/**
 * Thrown when a database connection or SQL query execution fails.
 */
class DatabaseException extends Exception
{
    private string $sqlState;

    public function __construct(
        string $message = 'A database error occurred.',
        int $code = 500,
        ?Throwable $previous = null,
        string $sqlState = 'HY000'
    ) {
        parent::__construct($message, $code, $previous);
        $this->sqlState = $sqlState;
    }

    public function getSqlState(): string
    {
        return $this->sqlState;
    }
}
