"use strict";

import fs from "fs";
import JwtGenerator from "./JwtGenerator";
import HashGenerator from "./HashGenerator";

/**
 * Right now only key/secret credentials are supported.
 * However, in time JWT will also be supported.
 * The `Credentials` object provides an abstraction to this.
 *
 * @param {string} apiKey - A Nexmo API Key
 * @param {string} apiSecret - A Nexmo API Secret
 * @param {string} [applicationId] - A Nexmo Application ID
 * @param {string|Buffer} [privateKey] -  When a string value is passed it should
 *                        either represent the path to the private key, or the actual
 *                        private key in string format. If a Buffer is passed then
 *                        it should be the key read from the file system.
 * @param {string} [signatureSecret] - A Nexmo signature Secret
 * @param {string} [signatureMethod] - A Nexmo compatible request signing method
 */
class Credentials {
  constructor(
    apiKey,
    apiSecret,
    privateKey,
    applicationId,
    signatureSecret,
    signatureMethod
  ) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;

    this.privateKey = null;
    this.applicationId = applicationId;

    this.signatureSecret = signatureSecret;
    this.signatureMethod = signatureMethod;

    if (privateKey instanceof Buffer) {
      // it is already a buffer, use it as-is
      this.privateKey = privateKey;
    } else if (typeof privateKey === "string") {
      // is this a filename that we can find?
      if (fs.existsSync(privateKey)) {
        // it is a file, use its contents
        this.privateKey = fs.readFileSync(privateKey);
      } else {
        // a string but not a filename, does it look like a key?
        if(privateKey.startsWith("-----BEGIN PRIVATE KEY-----")) {
          // OK it's a key. Check for \n, replace with newlines
          privateKey = privateKey.replace(/\\n/g, '\n');
          this.privateKey = Buffer.from(privateKey, 'utf-8');
        }
      }
    }

    /** @private */
    this._jwtGenerator = new JwtGenerator();
    this._hashGenerator = new HashGenerator();
  }

  /**
   * Generate a Jwt using the Private Key in the Credentials.
   * By default the credentials.applicationId will be used when creating the token.
   * However, this can be overwritten.
   *
   * @param {string} [applicationId] an application ID to be used instead of the
   *                default Credentials.applicationId value.
   *
   * @returns {string} The generated JWT
   */
  generateJwt(
    applicationId = this.applicationId,
    privateKey = this.privateKey
  ) {
    var claims = {
      application_id: applicationId
    };
    var token = this._jwtGenerator.generate(privateKey, claims);
    return token;
  }

  generateSignature(
    params,
    signatureSecret = this.signatureSecret,
    signatureMethod = this.signatureMethod
  ) {
    return this._hashGenerator.generate(
      signatureMethod,
      signatureSecret,
      params
    );
  }

  /**
   * @private
   * Used for testing purposes only.
   */
  _setJwtGenerator(generator) {
    this._jwtGenerator = generator;
  }

  /**
   * @private
   * Used for testing purposes only.
   */
  _setHashGenerator(generator) {
    this._hashGenerator = generator;
  }

  /**
   * Ensures a credentials instance is used.
   *
   * Key/Secret credentials are only supported at present.
   */
  static parse(obj) {
    if (obj instanceof Credentials) {
      return obj;
    } else {
      return new Credentials(
        obj.apiKey,
        obj.apiSecret,
        obj.privateKey,
        obj.applicationId,
        obj.signatureSecret,
        obj.signatureMethod
      );
    }
  }
}

export default Credentials;
