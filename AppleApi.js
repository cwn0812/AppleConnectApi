const fs = require('fs');
const jwt = require('jsonwebtoken');
const https = require('https');
const querystring = require('querystring');

const TOKEN_VALID_TIME = 1200;

function Bundle(id, identifier_id) {
    this.id = id;
    this.identifier_id = identifier_id;
}

function Device(id, udid) {
    this.id = id;
    this.udid = udid;
}

function Certificates(id, cert_type) {
    this.id = id;
    this.cert_type = cert_type;
}

function Profile(id, name, content) {
    this.id = id;
    this.name = name;
    this.content = content;
}

Profile.prototype.download = function (filePath) {
    let data = Buffer.from(this.content, "base64");
    fs.writeFileSync(filePath, data, "binary");
}

function AppleApi(iis, kid, keyPath) {
    this._szAppleToken = "";
    this._nValidTime = 0;

    this._iis = iis;
    this._kid = kid;
    this._privateKey = fs.readFileSync(keyPath);

    this._bRegister = false;
    this._registerDeviceList = [];
}

AppleApi.prototype.get_bundle_list = function (callback, params) {
    let body = {
    }
    if (params) {
        for (const key in params) {
            body[key] = params[key];
        }
    }
}

AppleApi.prototype._api_call = function (uri, post_data = null, method = "GET", callback = null) {
    let szToken = this.get_apple_token();
    if (method == "GET" && post_data) {
        uri = uri + "?" + querystring.stringify(post_data);
    }
    const options = {
        hostname: 'api.appstoreconnect.apple.com',
        port: 443,
        path: uri,
        method: method,
        headers: {
            Authorization: "Bearer " + szToken,
        },
    };

    if (method == "POST") {
        options.headers["Content-Type"] = "application/json";
    }

    let req = https.request(options, (res) => {
        res.setEncoding('utf-8');
        var _data = '';
        res.on('data', function (chunk) {
            _data += chunk;
        });
        res.on('end', function () {
            if (res.statusCode == 200 || res.statusCode == 201 || res.statusCode == 409) {
                if (res.headers && res.headers["content-type"] == "application/json") {
                    callback(0, JSON.parse(_data));
                }
                else {
                    callback(0, _data);
                }
            }
            else {
                callback(-2, res.statusCode);
            }
        });
        res.on('error', function (e) {
            callback(-3, e.message);
        });
    });
    req.on('error', function (e) {
        callback(-3, e.message);
    });
    if (post_data) {
        if (method == "POST") {
            let content = JSON.stringify(post_data);
            req.write(content);
        }
    }
    req.end();
}

AppleApi.prototype.get_second = function () {
    return Math.round((new Date()).getTime() / 1000);
}

AppleApi.prototype.get_apple_token = function () {
    let nNowTime = this.get_second();

    if (this._szAppleToken == "" || this._nValidTime <= nNowTime) {
        this._szAppleToken = this.get_apple_token_real();
        this._nValidTime = nNowTime + TOKEN_VALID_TIME - 15; //有效时间，减少15
    }

    return this._szAppleToken;
}

AppleApi.prototype.get_apple_token_real = function () {
    let payload = {
        "iss": this._iis,
        "exp": this.get_second() + TOKEN_VALID_TIME,
        "aud": "appstoreconnect-v1"
    }

    let signOptions = {
        "algorithm": "ES256",
        header: {
            "alg": "ES256",
            "kid": this._kid,
            "typ": "JWT"
        }
    };

    let token = jwt.sign(payload, this._privateKey, signOptions);
    return token;
}

AppleApi.prototype.get_bundle_list = function (callback, params = null) {
    let body = {
    }
    if (params) {
        for (const key in params) {
            body[key] = params[key];
        }
    }

    this._api_call("/v1/bundleIds", body, "GET", (code, resp) => {
        // console.log("get_bundle_list:", code, resp);
        if (code) {
            callback(code, "系统异常");
            return;
        }
        let data = resp["data"];
        let result = [];
        for (const key in data) {
            let info = data[key];
            let id = info["id"];
            let attributes = info["attributes"];
            let identifier = attributes["identifier"];
            let unit = new Bundle(id, identifier);
            result.push(unit);
        }
        callback(0, result);
    });
}

AppleApi.prototype.get_bundle_by_identifier_id = function (identifier_id, callback) {
    let params = {
        ["filter[identifier]"]: identifier_id,
    }

    this.get_bundle_list((code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        callback(0, data[0]);
    }, params);
}

AppleApi.prototype.get_profile_name_by_indentifier_id = function (identifier_id) {
    return identifier_id + "_Adhoc2";
}

AppleApi.prototype.get_profile_list = function (callback, params = null) {
    let body = {
    }
    if (params) {
        for (const key in params) {
            body[key] = params[key];
        }
    }

    this._api_call("/v1/profiles", body, "GET", (code, resp) => {
        // console.log("get_profile_list:", code, resp);
        if (code) {
            callback(code, "系统异常");
            return;
        }
        let data = resp["data"];
        let result = [];
        for (const key in data) {
            let info = data[key];
            let id = info["id"];
            let attributes = info["attributes"];
            let name = attributes["name"];
            let profileContent = attributes["profileContent"];
            let unit = new Profile(id, name, profileContent);
            result.push(unit);
        }
        callback(0, result);
    });
}

AppleApi.prototype.get_profile_by_name = function (profile_name, callback) {
    let params = {
        ["filter[name]"]: profile_name,
    }
    this.get_profile_list((code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        callback(0, data[0]);
    }, params);
}

AppleApi.prototype.delete_profile = function (profile_id, callback) {
    this._api_call("/v1/profiles/" + profile_id, null, "DELETE", (code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        callback(0, data);
    });
}

AppleApi.prototype.create_profile = function (identifier_id, callback) {
    let profile_name = this.get_profile_name_by_indentifier_id(identifier_id);
    this.get_profile_by_name(profile_name, (code, data) => {
        if (code) {
            callback(code, data);
            return;
        }

        if (data) {
            this.delete_profile(data.id, (code, data) => {
                this.create_profile_ex(identifier_id, callback);
            });
        }
        else {
            this.create_profile_ex(identifier_id, callback);
        }
    });
}

AppleApi.prototype.create_profile_ex = function (identifier_id, callback) {
    this.get_bundle_by_identifier_id(identifier_id, (code, data) => {
        if (code) {
            callback(code, data);
            return;
        }

        let bundleInfo = data;
        this.get_first_dis_cert((code, data) => {
            if (code) {
                callback(code, data);
                return;
            }

            let certInfo = data;
            this.get_device_list((code, data) => {
                if (code) {
                    callback(code, data);
                    return;
                }

                let device_id_list = [];
                let deviceList = data;;
                for (const key in deviceList) {
                    device_id_list.push(deviceList[key].id);
                }

                this.create_profile_real(bundleInfo.id, certInfo.id, device_id_list, identifier_id, (code, data) => {
                    if (code) {
                        callback(code, data);
                        return;
                    }

                    callback(0, data);
                });
            });
        });
    });
}

AppleApi.prototype.create_profile_real = function (bundle_id, cert_id, device_id_list, identifier_id, callback) {
    let devices = [];
    for (const key in device_id_list) {
        devices.push({
            ["id"]: device_id_list[key],
            ["type"]: "devices",
        });
    }
    let profile_name = this.get_profile_name_by_indentifier_id(identifier_id);
    let params = {
        ["data"]: {
            ["type"]: "profiles",
            ["attributes"]: {
                ["name"]: profile_name,
                ["profileType"]: "IOS_APP_ADHOC",
            },
            ["relationships"]: {
                ["bundleId"]: {
                    ["data"]: {
                        ["id"]: bundle_id,
                        ["type"]: "bundleIds",
                    }
                },
                ["certificates"]: {
                    ["data"]: [
                        {
                            ["id"]: cert_id,
                            ["type"]: "certificates",
                        }
                    ]
                },
                ["devices"]: {
                    ["data"]: devices,
                }
            }
        }
    }

    this._api_call("/v1/profiles", params, "POST", (code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        let info = data["data"];
        let id = info["id"];
        let attributes = info["attributes"];
        let name = attributes["name"];
        let profileContent = attributes["profileContent"];
        let unit = new Profile(id, name, profileContent);
        callback(0, unit);
    });


}

AppleApi.prototype.get_cert_list = function (callback, params = null) {
    let body = {
    }
    if (params) {
        for (const key in params) {
            body[key] = params[key];
        }
    }

    this._api_call("/v1/certificates", body, "GET", (code, resp) => {
        // console.log("get_cert_list:", code, resp);
        if (code) {
            callback(code, "系统异常");
            return;
        }
        let data = resp["data"];
        let result = [];
        for (const key in data) {
            let info = data[key];
            let id = info["id"];
            let attributes = info["attributes"];
            let cert_type = attributes["certificateType"];
            let unit = new Certificates(id, cert_type);
            result.push(unit);
        }
        callback(0, result);
    });
}

AppleApi.prototype.get_first_dis_cert = function (callback) {
    let params = {
        ["filter[certificateType]"]: "IOS_DISTRIBUTION",
    }

    this.get_cert_list((code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        callback(0, data[0]);
    }, params);
}

//获取设备列表
AppleApi.prototype.get_device_list = function (callback, params = null) {
    let body = {
        limit: 100,
    }
    if (params) {
        for (const key in params) {
            body[key] = params[key];
        }
    }

    this._api_call("/v1/devices", body, "GET", (code, resp) => {
        // console.log("getDeviceList:", code, resp);
        if (code) {
            callback(code, "系统异常");
            return;
        }
        let data = resp["data"];
        let result = [];
        for (const key in data) {
            let info = data[key];
            let id = info["id"];
            let attributes = info["attributes"];
            let udid = attributes["udid"];
            let unit = new Device(id, udid);
            result.push(unit);
        }
        callback(0, result);
    });
}

//通过udid查到设备
AppleApi.prototype.get_device = function (udid, callback) {
    let body = {
        ["filter[udid]"]: udid
    }
    this.get_device_list((code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        callback(code, data[0]);
    }, body);
};

//注册设备
AppleApi.prototype.register_device = function (udid, callback) {
    this.get_device(udid, (code, data) => {
        if (code) {
            callback(code, data);
            return;
        }
        if (data) {   //设备已注册
            callback(code, data);
        }
        else {
            this.register_device_real(udid, (code, data) => {
                if (code) {
                    callback(code, data);
                    return;
                }
                callback(0, data);
            });
        }
    });
}

//注册设备
AppleApi.prototype.register_device_real = function (udid, callback) {
    let body = {
        data: {
            attributes: {
                name: udid,
                platform: "IOS",
                udid: udid,
            },
            type: "devices"
        }
    }
    this._api_call("/v1/devices", body, "POST", (code, data) => {
        if (code) {
            callback(code, "系统异常");
            return;
        }
        callback(0, udid);
    });
}

//注册设备，并且添加到授权文件里
AppleApi.prototype.register_device_and_profile = function(udid, identifier_id, callback){
    for (const key in this._registerDeviceList) {
        let registerInfo = this._registerDeviceList[key];
        if(registerInfo.udid == udid){  //已经在注册中
            return;
        }
    }

    this._registerDeviceList.push({
        udid: udid,
        identifier_id: identifier_id,
        callback: callback,
    });

    this.fresh_register_device_list();
}

AppleApi.prototype.fresh_register_device_list = function(){
    if(this._bRegister){
        return;
    }

    if(this._registerDeviceList.length <= 0){
        return;
    }

    let registerInfo = this._registerDeviceList[0];
    this._registerDeviceList.splice(0, 1);

    this._bRegister = true;
    this.register_device_and_profile_real(registerInfo.udid, registerInfo.identifier_id, (code, data)=>{
        this._bRegister = false;
        registerInfo.callback(code, data);

        this.fresh_register_device_list();
    });
}

AppleApi.prototype.register_device_and_profile_real = function(udid, identifier_id, callback){
    this.register_device(udid, (code, data)=>{
        if(code){
            callback(code, data);
            return;
        }

        this.create_profile(identifier_id, (code, data)=>{
            if(code){
                callback(code, data);
                return;
            }
            callback(0, data);
        });
    });
}

module.exports = AppleApi;
