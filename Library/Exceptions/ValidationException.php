<?php

declare(strict_types=1);

namespace Library\Exceptions;

use Exception;
use Throwable;

/**
 * Thrown when user input (email, password, form fields, voucher code, or product pricing) fails validation.
 */
class ValidationException extends Exception
{
    /** @var array<string, string> */
    private array $errors;

    /**
     * @param string $message
     * @param array<string, string> $errors
     * @param int $code
     * @param Throwable|null $previous
     */
    public function __construct(
        string $message = 'Validation failed.',
        array $errors = [],
        int $code = 422,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
        $this->errors = $errors;
    }

    /**
     * @return array<string, string>
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}
