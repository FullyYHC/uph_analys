import { pmPool } from '../db';

// 定义TOP3数据项接口
interface Top3DataItem {
  serial_number: number;
  lineName: string;
  model_type: string;
  lineModel: string;
  data_source: string;
  diffTotal: number;
}

// 定义AlarmInfo数据项接口
interface AlarmInfoItem {
  pc_number: string;
  model: string;
  location: string;
  alarm_message: string;
  updated_at: Date;
  alarm_level: string;
}

/**
 * 检查当天是否已推送数据
 * @returns {Promise<boolean>} 是否已推送
 */
export async function checkTodayPush(): Promise<boolean> {
  try {
    // 获取当天日期（YYYY-MM-DD格式）
    const today = new Date().toISOString().split('T')[0];
    
    // 查询当天是否已有TOP3推送记录
    const [rows] = await pmPool.query(
      'SELECT COUNT(*) as count FROM alarm_info WHERE DATE(updated_at) = ? AND alarm_level = ?',
      [today, 'UPH_TOP3差异推送']
    );
    
    const count = (rows as any[])[0]?.count || 0;
    return count > 0;
  } catch (error) {
    console.error('Error checking today push status:', error);
    throw error;
  }
}

/**
 * 获取TOP3差异数据
 * @returns {Promise<Top3DataItem[]>} TOP3差异数据列表
 */
export async function fetchTop3Data(): Promise<Top3DataItem[]> {
  try {
    // 计算时间范围：前一日01:00:00至当日01:00:00
    const now = new Date();
    
    // 当日凌晨1:00:00
    const today = new Date(now);
    today.setHours(1, 0, 0, 0);
    
    // 前一日凌晨1:00:00
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 转换为SQL需要的字符串格式
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    };
    
    const yesterdayStr = formatDate(yesterday);
    const todayStr = formatDate(today);
    
    console.log(`Fetching TOP3 data for time range: ${yesterdayStr} to ${todayStr}`);
    
    // 查询符合条件的数据，只取负数差异的记录
    const [rows] = await pmPool.query(
      `SELECT 
        serial_number, 
        lineName, 
        model_type, 
        lineModel, 
        data_source, 
        (diff_cnt_8_10 + diff_cnt_10_12 + diff_cnt_12_14 + diff_cnt_14_16 + 
        diff_cnt_16_18 + diff_cnt_18_20 + diff_cnt_20_22 + diff_cnt_22_24 + 
        diff_cnt_24_2 + diff_cnt_2_4 + diff_cnt_4_6 + diff_cnt_6_8) as diffTotal 
      FROM uph_analys 
      WHERE 
        date_record BETWEEN ? AND ? 
        AND lineName LIKE 'A%' 
        AND (diff_cnt_8_10 + diff_cnt_10_12 + diff_cnt_12_14 + diff_cnt_14_16 + 
        diff_cnt_16_18 + diff_cnt_18_20 + diff_cnt_20_22 + diff_cnt_22_24 + 
        diff_cnt_24_2 + diff_cnt_2_4 + diff_cnt_4_6 + diff_cnt_6_8) < 0 
      ORDER BY 
        data_source, 
        diffTotal ASC`,
      [yesterdayStr, todayStr]
    );
    
    const data = rows as any[];
    
    // 按data_source分组，取每组前3条
    const groupedData: Record<string, Top3DataItem[]> = {};
    
    for (const row of data) {
      const source = row.data_source;
      if (!groupedData[source]) {
        groupedData[source] = [];
      }
      
      // 只取每组前3条
      if (groupedData[source].length < 3) {
        groupedData[source].push({
          serial_number: row.serial_number,
          lineName: row.lineName,
          model_type: row.model_type,
          lineModel: row.lineModel,
          data_source: row.data_source,
          diffTotal: row.diffTotal
        });
      }
    }
    
    // 合并所有组的数据
    return Object.values(groupedData).flat();
  } catch (error) {
    console.error('Error fetching TOP3 data:', error);
    throw error;
  }
}

/**
 * 将TOP3数据同步到alarm_info表
 * @param top3Data TOP3差异数据列表
 * @returns {Promise<number>} 同步的记录数量
 */
export async function syncToAlarmInfo(top3Data: Top3DataItem[]): Promise<number> {
  if (!top3Data.length) {
    console.log('No TOP3 data to sync');
    return 0;
  }
  
  try {
    // 准备插入数据
    const now = new Date();
    const insertData = top3Data.map(item => {
      // 转换data_source：cs→HNZ, sz→ZLT
      const pcNumber = item.data_source === 'cs' ? 'HNZ' : 'ZLT';
      
      return [
        pcNumber,
        item.model_type,
        item.lineName,
        `差异：${item.diffTotal}`,
        now,
        'UPH_TOP3差异推送',
        '', // 新增：mac_address字段，提供空字符串作为默认值
        ''  // 新增：responsible_person字段，提供空字符串作为默认值
      ];
    });
    
    // 批量插入数据
    const [result] = await pmPool.query(
      'INSERT INTO alarm_info (pc_number, model, location, alarm_message, updated_at, alarm_level, mac_address, responsible_person) VALUES ?',
      [insertData]
    );
    
    const affectedRows = (result as any).affectedRows || 0;
    console.log(`Synced ${affectedRows} TOP3 records to alarm_info`);
    return affectedRows;
  } catch (error) {
    console.error('Error syncing TOP3 data to alarm_info:', error);
    throw error;
  }
}

/**
 * 执行TOP3推送操作
 * @returns {Promise<{ success: boolean; message: string; count?: number }>} 推送结果
 */
export async function pushTop3Data(): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    console.log('Starting TOP3 data push...');
    
    // 检查当天是否已推送
    const hasPushed = await checkTodayPush();
    console.log(`Today push status: ${hasPushed}`);
    
    if (hasPushed) {
      console.log('TOP3 data already pushed today, skipping...');
      return {
        success: false,
        message: '当天数据已经推送、无需重复推送！'
      };
    }
    
    // 获取TOP3数据
    console.log('Fetching TOP3 data...');
    const top3Data = await fetchTop3Data();
    console.log(`Found ${top3Data.length} TOP3 data items`);
    
    if (!top3Data.length) {
      console.log('No TOP3 data found, skipping push...');
      return {
        success: true,
        message: '没有找到符合条件的TOP3差异数据'
      };
    }
    
    // 同步到alarm_info表
    console.log('Syncing TOP3 data to alarm_info table...');
    const count = await syncToAlarmInfo(top3Data);
    console.log(`TOP3 data sync completed, pushed ${count} records`);
    
    return {
      success: true,
      message: `TOP3数据推送成功！共推送${count}条记录`,
      count
    };
  } catch (error) {
    console.error('Error pushing TOP3 data:', error);
    return {
      success: false,
      message: `TOP3数据推送失败：${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}
