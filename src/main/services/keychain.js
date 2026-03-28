const SERVICE_NAME = 'YumboSQL';

class KeychainService {
  constructor() {
    this.keytar = null;
  }

  async _getKeytar() {
    if (!this.keytar) {
      this.keytar = require('keytar');
    }
    return this.keytar;
  }

  async save(account, password) {
    const keytar = await this._getKeytar();
    await keytar.setPassword(SERVICE_NAME, account, password);
  }

  async get(account) {
    const keytar = await this._getKeytar();
    return keytar.getPassword(SERVICE_NAME, account);
  }

  async remove(account) {
    const keytar = await this._getKeytar();
    await keytar.deletePassword(SERVICE_NAME, account);
  }
}

module.exports = KeychainService;
