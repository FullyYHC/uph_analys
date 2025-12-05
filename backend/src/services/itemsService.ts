import { pmPool } from '../db'
import { UphItem } from '../models/types'

type PatchBody = {
  line_leader_item?: string
  pie_item?: string
  qc_item?: string
}

export async function getItemById(id: number) {
  const [rows] = await pmPool.query('SELECT * FROM uph_item WHERE id = ?', [id])
  return (rows as any[])[0] as UphItem | undefined
}

export async function updateItemPartial(id: number, body: PatchBody, chineseName: string) {
  console.log(`Updating item ${id} with body:`, body, `and chineseName:`, chineseName);
  
  // Ensure the record exists
  let recordExists = false;
  let [exists] = await pmPool.query('SELECT id FROM uph_item WHERE id = ?', [id]);
  recordExists = (exists as any[]).length > 0;
  
  if (!recordExists) {
    // Insert new record if not exists
    try {
      console.log(`Inserting new record for id: ${id}`);
      // Use unique values for fields with unique constraints to avoid duplicate entry errors
      // This ensures the unique index idx_item_line is not violated
      await pmPool.query('INSERT INTO uph_item (id, line_leader_item, line_name, pie_item, pie_name, qc_item, qc_name) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [
          id, 
          '', 
          `line_${id}`, // Use unique value for line_name with id as suffix
          '', 
          `pie_${id}`, // Use unique value for pie_name with id as suffix
          '', 
          `qc_${id}` // Use unique value for qc_name with id as suffix
        ]);
      console.log(`Inserted new record for id: ${id}`);
      recordExists = true;
    } catch (err: any) {
      if (err.code !== 'ER_DUP_ENTRY') {
        console.error(`Failed to insert record for id: ${id}`, err);
        throw err;
      }
      console.log(`Record for id: ${id} already exists (race condition)`);
      recordExists = true;
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  
  // Build update fields
  if (body.line_leader_item !== undefined) {
    fields.push('line_leader_item = ?');
    values.push(body.line_leader_item || '');
    if (chineseName) {
      fields.push('line_name = ?');
      values.push(chineseName);
    }
  }
  if (body.pie_item !== undefined) {
    fields.push('pie_item = ?');
    values.push(body.pie_item || '');
    if (chineseName) {
      fields.push('pie_name = ?');
      values.push(chineseName);
    }
  }
  if (body.qc_item !== undefined) {
    fields.push('qc_item = ?');
    values.push(body.qc_item || '');
    if (chineseName) {
      fields.push('qc_name = ?');
      values.push(chineseName);
    }
  }
  
  // If no fields to update, return current item
  if (!fields.length) {
    console.log(`No fields to update for id: ${id}, returning current item`);
    const currentItem = await getItemById(id);
    if (!currentItem) {
      console.error(`No current item found for id: ${id}`);
      throw new Error(`Item ${id} not found`);
    }
    return currentItem;
  }
  
  // Execute update
  const sql = `UPDATE uph_item SET ${fields.join(', ')} WHERE id = ?`;
  console.log(`Executing update: ${sql} with values:`, [...values, id]);
  const [result] = await pmPool.query(sql, [...values, id]);
  console.log(`Update result for id ${id}:`, result);
  
  // Check if any rows were updated
  if ((result as any).affectedRows === 0) {
    console.warn(`No rows updated for id: ${id}, record might have been deleted`);
    // Try to insert again if record was deleted
    try {
      console.log(`Attempting to insert record again for id: ${id}`);
      // Use unique values for fields with unique constraints to avoid duplicate entry errors
      await pmPool.query('INSERT INTO uph_item (id, line_leader_item, line_name, pie_item, pie_name, qc_item, qc_name) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [
          id, 
          '', 
          `line_${id}`, // Use unique value for line_name with id as suffix
          '', 
          `pie_${id}`, // Use unique value for pie_name with id as suffix
          '', 
          `qc_${id}` // Use unique value for qc_name with id as suffix
        ]);
      console.log(`Inserted record again for id: ${id}, now updating`);
      // Try update again
      await pmPool.query(sql, [...values, id]);
      console.log(`Second update attempt successful for id: ${id}`);
    } catch (err: any) {
      console.error(`Failed to update or insert record for id: ${id}`, err);
      throw err;
    }
  }
  
  // Query updated record
  console.log(`Querying updated record for id: ${id}`);
  const [updated] = await pmPool.query('SELECT * FROM uph_item WHERE id = ?', [id]);
  const updatedItem = (updated as any[])[0] as UphItem;
  
  if (!updatedItem) {
    console.error(`Failed to retrieve updated item for id: ${id}`);
    throw new Error(`Failed to retrieve updated item for id: ${id}`);
  }
  
  console.log(`Returning updated item for id ${id}:`, updatedItem);
  return updatedItem;
}
