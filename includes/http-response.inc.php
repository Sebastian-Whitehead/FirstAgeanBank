<?php
function isJsonRequest(): bool
{
    return str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')
        || str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')
        || ($_GET['format'] ?? '') === 'json';
}

function finishRequest(string $location, ?string $error = null): void
{
    if (isJsonRequest()) {
        http_response_code($error === null ? 200 : 422);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => $error === null,
            'error' => $error,
            'redirect' => $location
        ]);
        exit();
    }

    header('Location: '.$location);
    exit();
}
