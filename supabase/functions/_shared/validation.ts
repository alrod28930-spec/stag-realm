// validation.ts - Data validation utilities for edge functions

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate workspace exists and user has access
 */
export async function validateWorkspaceAccess(
  supabase: any,
  workspaceId: string,
  userId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workspaceId || !userId) {
    errors.push('Missing workspace_id or user_id');
    return { valid: false, errors, warnings };
  }

  // Check workspace exists
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id, owner_id')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError) {
    errors.push(`Workspace query failed: ${wsError.message}`);
    return { valid: false, errors, warnings };
  }

  if (!workspace) {
    errors.push('Workspace not found');
    return { valid: false, errors, warnings };
  }

  // Check membership
  const { data: membership, error: memError } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memError) {
    errors.push(`Membership query failed: ${memError.message}`);
    return { valid: false, errors, warnings };
  }

  if (!membership) {
    errors.push('User not a member of workspace');
    return { valid: false, errors, warnings };
  }

  return { valid: true, errors, warnings };
}

/**
 * Validate brokerage credentials structure
 */
export function validateCredentials(
  apiKey: string | null | undefined,
  secretKey: string | null | undefined
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!apiKey || typeof apiKey !== 'string') {
    errors.push('Invalid or missing API key');
  } else {
    if (apiKey.length < 10) {
      errors.push('API key too short');
    }
    if (apiKey.length > 200) {
      errors.push('API key too long');
    }
    if (!/^[A-Za-z0-9_-]+$/.test(apiKey)) {
      warnings.push('API key contains unusual characters');
    }
  }

  if (!secretKey || typeof secretKey !== 'string') {
    errors.push('Invalid or missing secret key');
  } else {
    if (secretKey.length < 10) {
      errors.push('Secret key too short');
    }
    if (secretKey.length > 200) {
      errors.push('Secret key too long');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate encrypted credential storage
 */
export function validateEncryptedData(
  cipher: any,
  nonce: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!cipher) {
    errors.push('Missing encrypted data');
  }

  if (!nonce) {
    errors.push('Missing encryption nonce');
  }

  // Check if data is properly base64 encoded
  if (cipher && typeof cipher === 'string') {
    try {
      atob(cipher);
    } catch (e) {
      errors.push('Encrypted data is not valid base64');
    }
  }

  if (nonce && typeof nonce === 'string') {
    try {
      atob(nonce);
    } catch (e) {
      errors.push('Nonce is not valid base64');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate portfolio data structure
 */
export function validatePortfolioData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data) {
    errors.push('Portfolio data is null or undefined');
    return { valid: false, errors, warnings };
  }

  // Check required fields
  if (typeof data.equity !== 'number' && data.equity !== null) {
    errors.push('Invalid equity value');
  }

  if (typeof data.cash !== 'number' && data.cash !== null) {
    errors.push('Invalid cash value');
  }

  // Sanity checks
  if (data.equity < 0) {
    warnings.push('Negative equity detected');
  }

  if (data.cash < 0) {
    warnings.push('Negative cash detected');
  }

  if (data.equity > 100000000) {
    warnings.push('Unusually high equity value');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate position data
 */
export function validatePosition(position: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!position) {
    errors.push('Position data is null');
    return { valid: false, errors, warnings };
  }

  if (!position.symbol || typeof position.symbol !== 'string') {
    errors.push('Missing or invalid symbol');
  }

  if (typeof position.qty !== 'number') {
    errors.push('Invalid quantity');
  }

  if (typeof position.mv !== 'number') {
    errors.push('Invalid market value');
  }

  // Sanity checks
  if (position.qty === 0) {
    warnings.push('Position has zero quantity');
  }

  if (position.mv < 0) {
    warnings.push('Negative market value detected');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate sync operation readiness
 */
export async function validateSyncReadiness(
  supabase: any,
  workspaceId: string,
  broker: string,
  mode: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check connection exists
  const { data: connection, error: connError } = await supabase
    .from('connections_brokerages')
    .select('api_key_cipher, nonce, status')
    .eq('workspace_id', workspaceId)
    .eq('provider', broker)
    .eq('mode', mode)
    .maybeSingle();

  if (connError) {
    errors.push(`Connection query failed: ${connError.message}`);
    return { valid: false, errors, warnings };
  }

  if (!connection) {
    errors.push('Brokerage connection not found');
    return { valid: false, errors, warnings };
  }

  if (!connection.api_key_cipher || !connection.nonce) {
    errors.push('Credentials not encrypted or missing');
    return { valid: false, errors, warnings };
  }

  if (connection.status !== 'active') {
    warnings.push(`Connection status is ${connection.status}, not active`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Log validation results
 */
export function logValidation(
  context: string,
  result: ValidationResult
): void {
  if (!result.valid) {
    console.error(`❌ Validation failed [${context}]:`, result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn(`⚠️ Validation warnings [${context}]:`, result.warnings);
  }
  if (result.valid && result.warnings.length === 0) {
    console.log(`✅ Validation passed [${context}]`);
  }
}
