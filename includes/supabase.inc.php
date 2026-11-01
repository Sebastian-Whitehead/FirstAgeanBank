<?php

final class SupabaseRequestException extends RuntimeException
{
    private string $supabaseCode;
    private string $supabaseMessage;

    public function __construct(string $message, string $supabaseCode = '', string $supabaseMessage = '')
    {
        parent::__construct($message);
        $this->supabaseCode = $supabaseCode;
        $this->supabaseMessage = $supabaseMessage;
    }

    public function getSupabaseCode(): string
    {
        return $this->supabaseCode;
    }

    public function getSupabaseMessage(): string
    {
        return $this->supabaseMessage;
    }
}

function supabaseRpc(string $function, array $parameters): ?array
{
    if (!preg_match('/^[a-z][a-z0-9_]*$/', $function)) {
        throw new InvalidArgumentException('Invalid Supabase RPC function name.');
    }

    $baseUrl = rtrim(getenv('SUPABASE_URL') ?: '', '/');
    $serviceKey = getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '';
    $urlParts = parse_url($baseUrl);
    if (
        $baseUrl === ''
        || $serviceKey === ''
        || !is_array($urlParts)
        || !isset($urlParts['scheme'], $urlParts['host'])
        || !in_array($urlParts['scheme'], ['https', 'http'], true)
        || ($urlParts['scheme'] === 'http' && !in_array($urlParts['host'], ['localhost', '127.0.0.1'], true))
    ) {
        throw new SupabaseRequestException('Supabase is not configured.');
    }

    try {
        $body = json_encode($parameters, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new SupabaseRequestException('Unable to prepare the Supabase request.');
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'apikey: '.$serviceKey,
                'Authorization: Bearer '.$serviceKey,
                'Content-Type: application/json',
                'Accept: application/json'
            ]),
            'content' => $body,
            'timeout' => 12,
            'ignore_errors' => true
        ]
    ]);

    set_error_handler(static function (int $severity, string $message): never {
        throw new ErrorException($message, 0, $severity);
    });
    try {
        $responseBody = file_get_contents($baseUrl.'/rest/v1/rpc/'.$function, false, $context);
    } catch (Throwable $error) {
        error_log('Supabase request failed: '.$error->getMessage());
        throw new SupabaseRequestException('Supabase is unavailable.');
    } finally {
        restore_error_handler();
    }

    $statusLine = $http_response_header[0] ?? '';
    if (!preg_match('/\s([0-9]{3})\s/', $statusLine, $statusMatch)) {
        throw new SupabaseRequestException('Supabase returned an invalid response.');
    }
    $status = (int)$statusMatch[1];
    $response = null;
    if (is_string($responseBody) && $responseBody !== '') {
        try {
            $response = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new SupabaseRequestException('Supabase returned an invalid response.');
        }
    }

    if ($status < 200 || $status >= 300) {
        $supabaseCode = is_array($response) && is_string($response['code'] ?? null)
            ? $response['code']
            : '';
        $message = is_array($response) && is_string($response['message'] ?? null)
            ? $response['message']
            : 'request error';
        error_log('Supabase RPC '.$function.' failed with HTTP '.$status.' ('.$supabaseCode.'): '.$message);
        throw new SupabaseRequestException('Supabase request failed.', $supabaseCode, $message);
    }

    if ($response === null) {
        return null;
    }
    if (!is_array($response)) {
        throw new SupabaseRequestException('Supabase returned an unexpected response.');
    }

    return $response;
}
