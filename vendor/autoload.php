<?php

declare(strict_types=1);

require_once __DIR__ . '/composer/Psr4Autoloader.php';

$loader = new \Composer\Autoload\Psr4Autoloader();
$loader->addNamespace('App\\', dirname(__DIR__) . '/App');
$loader->addNamespace('Library\\', dirname(__DIR__) . '/Library');
$loader->register();

$helpersFile = dirname(__DIR__) . '/Library/helpers.php';
if (is_file($helpersFile)) {
    require_once $helpersFile;
}

return $loader;
