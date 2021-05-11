# AppleConnectApi

#### 介绍
使用nodejs来实现Apple Connect Api的接口

#### 软件架构
nodejs v14.15.1

#### 安装教程

1.  npm install

#### 使用说明
1. const AppleApi = require("./AppleApi");

2. let appUtils = new AppleApi(iis, kid, keypath);

3. 获取设备列表
appUtils.get_device_list((code, result)=>{
    console.log("get_device_list:", code, result);
});

4. //注册设备
appUtils.register_device(udid, (code, result)=>{
    console.log("register_device:", code, result);
})

5. //获取bundle列表
appUtils.get_bundle_list((code, result)=>{
    console.log("get_bundle_list:", code, result);
});

6. //通过包名获取bundle信息
appUtils.get_bundle_by_identifier_id(identifier_id, (code, result)=>{
    console.log("get_bundle_by_identifier_id:", code, result);
});

7. //获取证书列表
appUtils.get_cert_list((code, result)=>{
    console.log("get_cert_list:", code, result);
});

8. //获取第一个发布证书
appUtils.get_first_dis_cert((code, result)=>{
    console.log("get_first_dis_cert:", code, result);
});

9. //获取profile列表
appUtils.get_profile_list((code, result)=>{
    console.log("get_profile_list:", code, result);
});

10. //注册设备，并且更新profile，这里需要有一个发布证书
appUtils.register_device_and_profile(udid, identifier_id, (code, result)=>{
    console.log("register_device_and_profile:", code, result);
    if(code){
        //有异常信息
        return;
    }

    //下载profile到本地目录
    result.download("./test.mobileprovision");
});

11. //更多接口，查看AppleApi.js