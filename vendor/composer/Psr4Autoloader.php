<?php

declare(strict_types=1);

namespace Composer\Autoload;

/**
 * PSR-4 Compliant Class Autoloader for Lillia & Rowena Furniture Atelier.
 * Maps namespace prefixes (e.g., LilliaRowena\Atelier\) to base directories (src/PhpAtelier/).
 */
final class Psr4Autoloader
{
    /** @var array<string, array<int, string>> */
    private array $prefixes = [];

    public function register(): void
    {
        spl_autoload_register([$this, 'loadClass']);
    }

    public function addNamespace(string $prefix, string $baseDir, bool $prepend = false): void
    {
        $prefix = trim($prefix, '\\') . '\\';
        $baseDir = rtrim($baseDir, DIRECTORY_SEPARATOR) . '/';

        if (!isset($this->prefixes[$prefix])) {
            $this->prefixes[$prefix] = [];
        }

        if ($prepend) {
            array_unshift($this->prefixes[$prefix], $baseDir);
        } else {
            $this->prefixes[$prefix][] = $baseDir;
        }
    }

    public function loadClass(string $class): ?string
    {
        $prefix = $class;

        while (false !== $pos = strrpos($prefix, '\\')) {
            $prefix = substr($class, 0, $pos + 1);
            $relativeClass = substr($class, $pos + 1);

            $mappedFile = $this->loadMappedFile($prefix, $relativeClass);
            if ($mappedFile !== null) {
                return $mappedFile;
            }

            $prefix = rtrim($prefix, '\\');
        }

        return null;
    }

    private function loadMappedFile(string $prefix, string $relativeClass): ?string
    {
        if (!isset($this->prefixes[$prefix])) {
            return null;
        }

        foreach ($this->prefixes[$prefix] as $baseDir) {
            $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
            if (is_file($file)) {
                require $file;
                return $file;
            }
        }

        return null;
    }
}
