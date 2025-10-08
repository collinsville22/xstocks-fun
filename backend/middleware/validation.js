/**
 * Input Validation Middleware
 * Validates and sanitizes user inputs to prevent injection attacks
 */

import pkg from '@solana/web3.js';
const { PublicKey } = pkg;

/**
 * Validates a Solana wallet address
 */
export function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a positive number
 */
export function isValidPositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0 && isFinite(num);
}

/**
 * Validates a non-negative number
 */
export function isValidNonNegativeNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && isFinite(num);
}

/**
 * Validates slippage (must be between 0 and 100)
 */
export function isValidSlippage(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0 && num <= 100 && isFinite(num);
}

/**
 * Validates a transaction signature
 */
export function isValidSignature(signature) {
  if (!signature || typeof signature !== 'string') {
    return false;
  }
  // Solana signatures are base58 encoded and typically 87-88 characters
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Validates an order ID (UUID v4 format)
 */
export function isValidOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId);
}

/**
 * Validates token mint address (Solana public key)
 */
export function isValidTokenMint(mint) {
  return isValidSolanaAddress(mint);
}

/**
 * Middleware to validate wallet balance request
 */
export function validateBalanceRequest(req, res, next) {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'walletAddress is required'
    });
  }

  if (!isValidSolanaAddress(walletAddress)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid Solana wallet address'
    });
  }

  next();
}

/**
 * Middleware to validate Jupiter quote request
 */
export function validateQuoteRequest(req, res, next) {
  const { inputMint, outputMint, amount, slippage } = req.query;

  if (!inputMint || !outputMint || !amount) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inputMint, outputMint, and amount are required'
    });
  }

  if (!isValidTokenMint(inputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid inputMint address'
    });
  }

  if (!isValidTokenMint(outputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid outputMint address'
    });
  }

  if (!isValidPositiveNumber(amount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'amount must be a positive number'
    });
  }

  if (slippage !== undefined && !isValidSlippage(slippage)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'slippage must be between 0 and 100'
    });
  }

  next();
}

/**
 * Middleware to validate swap request
 */
export function validateSwapRequest(req, res, next) {
  const { quoteResponse, userPublicKey } = req.body;

  if (!quoteResponse || !userPublicKey) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'quoteResponse and userPublicKey are required'
    });
  }

  if (!isValidSolanaAddress(userPublicKey)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid userPublicKey address'
    });
  }

  if (typeof quoteResponse !== 'object') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'quoteResponse must be an object'
    });
  }

  next();
}

/**
 * Middleware to validate limit order request
 */
export function validateLimitOrderRequest(req, res, next) {
  const {
    inputMint,
    outputMint,
    inputAmount,
    triggerPrice,
    walletAddress
  } = req.body;

  if (!inputMint || !outputMint || !inputAmount || !triggerPrice || !walletAddress) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inputMint, outputMint, inputAmount, triggerPrice, and walletAddress are required'
    });
  }

  if (!isValidTokenMint(inputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid inputMint address'
    });
  }

  if (!isValidTokenMint(outputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid outputMint address'
    });
  }

  if (!isValidPositiveNumber(inputAmount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inputAmount must be a positive number'
    });
  }

  if (!isValidPositiveNumber(triggerPrice)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'triggerPrice must be a positive number'
    });
  }

  if (!isValidSolanaAddress(walletAddress)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid walletAddress'
    });
  }

  next();
}

/**
 * Middleware to validate transaction send request
 */
export function validateTransactionRequest(req, res, next) {
  const { serializedTransaction } = req.body;

  if (!serializedTransaction) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'serializedTransaction is required'
    });
  }

  if (typeof serializedTransaction !== 'string') {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'serializedTransaction must be a string'
    });
  }

  next();
}

/**
 * Middleware to validate signature parameter
 */
export function validateSignatureParam(req, res, next) {
  const { signature } = req.params;

  if (!signature) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'signature is required'
    });
  }

  if (!isValidSignature(signature)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid transaction signature format'
    });
  }

  next();
}

/**
 * Middleware to validate wallet address parameter
 */
export function validateWalletAddressParam(req, res, next) {
  const { walletAddress } = req.params;

  if (!walletAddress) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'walletAddress is required'
    });
  }

  if (!isValidSolanaAddress(walletAddress)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid Solana wallet address'
    });
  }

  next();
}

/**
 * Middleware to validate order ID parameter
 */
export function validateOrderIdParam(req, res, next) {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId is required'
    });
  }

  if (!isValidOrderId(orderId)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid order ID format'
    });
  }

  next();
}

/**
 * Middleware to validate craft send transaction request
 */
export function validateCraftSendRequest(req, res, next) {
  const { inviteCode, sender, recipient, tokenMint, amount } = req.body;

  if (!inviteCode || !sender || !recipient || !tokenMint || !amount) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inviteCode, sender, recipient, tokenMint, and amount are required'
    });
  }

  if (!isValidSolanaAddress(sender)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid sender address'
    });
  }

  if (!isValidSolanaAddress(recipient)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid recipient address'
    });
  }

  if (!isValidTokenMint(tokenMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid tokenMint address'
    });
  }

  if (!isValidPositiveNumber(amount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'amount must be a positive number'
    });
  }

  if (typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inviteCode must be a non-empty string'
    });
  }

  next();
}

/**
 * Middleware to validate execute order request
 */
export function validateExecuteOrderRequest(req, res, next) {
  const { signedTransaction } = req.body;

  if (!signedTransaction) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'signedTransaction is required'
    });
  }

  if (!Array.isArray(signedTransaction) && !(signedTransaction instanceof Uint8Array)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'signedTransaction must be an array or Uint8Array'
    });
  }

  next();
}

/**
 * Middleware to validate monitoring start request
 */
export function validateMonitoringStartRequest(req, res, next) {
  const { orderId, maker } = req.body;

  if (!orderId || !maker) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId and maker are required'
    });
  }

  if (!isValidSolanaAddress(maker)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid maker address'
    });
  }

  // orderId can be any string format (not necessarily UUID for trigger orders)
  if (typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId must be a non-empty string'
    });
  }

  next();
}

/**
 * Middleware to validate monitoring stop request
 */
export function validateMonitoringStopRequest(req, res, next) {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId is required'
    });
  }

  if (typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId must be a non-empty string'
    });
  }

  next();
}

/**
 * Middleware to validate cleanup request
 */
export function validateCleanupRequest(req, res, next) {
  const { olderThanDays = 7 } = req.body;

  if (!isValidPositiveNumber(olderThanDays)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'olderThanDays must be a positive number'
    });
  }

  if (olderThanDays > 365) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'olderThanDays cannot exceed 365 days'
    });
  }

  next();
}

/**
 * Middleware to validate trigger order request
 */
export function validateTriggerOrderRequest(req, res, next) {
  const { inputMint, outputMint, makingAmount, takingAmount, maker, expiry } = req.body;

  if (!inputMint || !outputMint || !makingAmount || !takingAmount || !maker) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'inputMint, outputMint, makingAmount, takingAmount, and maker are required'
    });
  }

  if (!isValidTokenMint(inputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid inputMint address'
    });
  }

  if (!isValidTokenMint(outputMint)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid outputMint address'
    });
  }

  if (!isValidPositiveNumber(makingAmount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'makingAmount must be a positive number'
    });
  }

  if (!isValidPositiveNumber(takingAmount)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'takingAmount must be a positive number'
    });
  }

  if (!isValidSolanaAddress(maker)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid maker address'
    });
  }

  // Expiry is optional, but if provided, validate it's a valid date string
  if (expiry !== undefined) {
    const expiryDate = new Date(expiry);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid expiry date format'
      });
    }
  }

  next();
}

/**
 * Middleware to validate execute/cancel trigger order request
 */
export function validateTriggerOrderActionRequest(req, res, next) {
  const { maker } = req.body;
  const { orderId } = req.params;

  if (!maker) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'maker is required'
    });
  }

  if (!orderId) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId is required'
    });
  }

  if (!isValidSolanaAddress(maker)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid maker address'
    });
  }

  if (typeof orderId !== 'string' || orderId.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'orderId must be a non-empty string'
    });
  }

  next();
}

/**
 * Middleware to validate active orders query
 */
export function validateActiveOrdersQuery(req, res, next) {
  const { walletAddress } = req.query;

  // walletAddress is optional, but if provided, validate it
  if (walletAddress && !isValidSolanaAddress(walletAddress)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid walletAddress'
    });
  }

  next();
}
