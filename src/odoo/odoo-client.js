const xmlrpc = require('xmlrpc');

class OdooClient {
    constructor(url, db, username, password) {
        this.url = url;
        this.db = db;
        this.username = username;
        this.password = password;
        this.uid = null;
        
        // Extract host and port from URL
        const parsedUrl = new URL(url);
        this.commonClient = xmlrpc.createSecureClient({
            host: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: '/xmlrpc/2/common'
        });
        this.objectClient = xmlrpc.createSecureClient({
            host: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: '/xmlrpc/2/object'
        });
    }

    async authenticate() {
        return new Promise((resolve, reject) => {
            this.commonClient.methodCall('version', [], (error, version) => {
                if (error) return reject(error);
                
                this.commonClient.methodCall('authenticate', [
                    this.db,
                    this.username,
                    this.password,
                    {}
                ], (error, uid) => {
                    if (error) return reject(error);
                    if (!uid) return reject(new Error('Authentication failed'));
                    this.uid = uid;
                    resolve(uid);
                });
            });
        });
    }

    async execute(model, method, args, kwargs = {}) {
        if (!this.uid) await this.authenticate();
        
        return new Promise((resolve, reject) => {
            this.objectClient.methodCall('execute_kw', [
                this.db,
                this.uid,
                this.password,
                model,
                method,
                args,
                kwargs
            ], (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    }

    // Helper methods for your specific needs
    async searchRead(model, domain = [], fields = [], limit = 10) {
        return this.execute(model, 'search_read', [domain], { fields, limit });
    }

    async create(model, values) {
        return this.execute(model, 'create', [values]);
    }

    async write(model, ids, values) {
        return this.execute(model, 'write', [ids, values]);
    }
}

module.exports = OdooClient;
