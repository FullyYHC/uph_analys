实现 异常差异数据TOP3 同步到总异常表 ：alarm_info表的期望，具体原始要求如下：
一、每日凌晨02：00：00用定时器执行如下要求（定时周期为一天一次）：
1、用标准sql语句查询：pcmonitor.uph_analys表中 前一日凌晨01:00:00到当日01:00:00  中的lineName、serial_number、model_type、lineModel、data_source  ；
2、lineName提取等于 A字符开头的 内容；
3、lineName提取等于 A字符开头的 内容对应的serial_number、model_type、lineModel、data_source  信息同步获取；
4、以data_source字段中的cs和sz分别区分统计符合1-2点条件下：类似获取WEB前端页面：合计列 差异排名最大的前三行数据；


二、把满足第一大点获取到数据排列要求如下：
1、发送与接收数据表字段结构说明：
pc_number         model               location           alarm_message       updated_at                    alarm_level                          //alarm_info（接收数据表） 表字段结构

data_source        model_type       lineName         合计列差异数据       同步数据库的准确时间      UPH_TOP3差异推送             //uph_analys （发送数据表） + 前端计算数据 与时间 映射逻辑要求  

2、发送数据表 data_source 字段 同步到接收数据表 pc_number     字段时，cs 要转换成 HNZ,而sz要转换成：ZLT; 
3、合计列差异数据需要把前一日凌晨01:00:00到当日01:00:00  中 所有累计差异数中cs和sz区域中 且lineName提取等于 A字符开头的 内容差异最大的前三项分别罗列出来，总共是6条，分别同步到目标表对应
字段存储；
4、而所有的数据列在目标表的alarm_level        字段全部要以  “ UPH_TOP3差异推送  ”内容来进行全部填充；

三、数据源说明：
1、定时同步发送数据库表: MySql
IP: 192.168.1.130    PORT：3306
User: ems
pcmonitor.uph_analys
Possword: B8n$eQ!zW4%kLmX9

2、同时接收数据库表：MySql
IP: 192.168.1.130    PORT：3306
User: ems
pcmonitor.alarm_info
Possword: B8n$eQ!zW4%kLmX9


四、除了按天一次的同步定时同步数据外，还在要前端页面设计一个按钮名称为【TOP3推送】的手工按钮，用来测试，但要有如果设计要求：
1、如果检测到当天的时间已经推送过数据，则进行提示“当天数据已经推送、无需重复推送！”
2、如果手工在推送过程中要提示 推送中。。。     推送失败 ！ 推送成功！的具体醒目提示；








