const AppleApi = require("./AppleApi");

//aple connect api的秘钥信息
let iis = "testtest";
let kid = "test";
let keypath = "./sign.p8";

//测试的包名
let identifier_id = "com.test.mobile.test4";
//手机设备的udid
let udid = "1a2afcc4b41db77470ea256e220c1cdb97b07d44";

let appUtils = new AppleApi(iis, kid, keypath);
//获取设备列表
appUtils.get_device_list((code, result)=>{
    console.log("get_device_list:", code, result);
});

//注册设备
appUtils.register_device(udid, (code, result)=>{
    console.log("register_device:", code, result);
})

//获取bundle列表
appUtils.get_bundle_list((code, result)=>{
    console.log("get_bundle_list:", code, result);
});

//通过包名获取bundle信息
appUtils.get_bundle_by_identifier_id(identifier_id, (code, result)=>{
    console.log("get_bundle_by_identifier_id:", code, result);
});

//获取证书列表
appUtils.get_cert_list((code, result)=>{
    console.log("get_cert_list:", code, result);
});

//获取第一个发布证书
appUtils.get_first_dis_cert((code, result)=>{
    console.log("get_first_dis_cert:", code, result);
});

//获取profile列表
appUtils.get_profile_list((code, result)=>{
    console.log("get_profile_list:", code, result);
});

//注册设备，并且更新profile，这里需要有一个发布证书
appUtils.register_device_and_profile(udid, identifier_id, (code, result)=>{
    console.log("register_device_and_profile:", code, result);
    if(code){
        //有异常信息
        return;
    }

    //下载profile到本地目录
    result.download("./test.mobileprovision");
});
