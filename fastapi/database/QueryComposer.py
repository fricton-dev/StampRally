from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime, date, time
import re

class QueryComposer:
    default_schema = None

    def __init__(self, tenant_id: Optional[str] = None, schema: Optional[str] = default_schema):
        self.tenant_id = tenant_id
        self.schema = schema

    def _convert_to_snake_case(self, name: str) -> str:
        """Convert PascalCase to snake_case for table names"""
        snake_case = re.sub('([a-z0-9])([A-Z])', r'\1_\2', name)
        return snake_case.lower()

    def generate_query(
        self,
        datamodel: BaseModel = None,
        related_models: Optional[List[BaseModel]] = None,
        sqltype: str = "",
        addSqlQuery: str = "",
        conditions: Optional[Dict] = None,
        join_clause: Optional[str] = None,
        select_fields: Optional[str] = None
    ) -> str:
        related_fields = ""
        if related_models:
            for model in related_models:
                model_fields = ", ".join([f"{field}" for field in model.__fields__.keys()])
                related_fields += ", " + model_fields if model_fields else ""

        table_name = self._convert_to_snake_case(datamodel.__class__.__name__)
        if self.schema:
            table_name = f"{self.schema}.{table_name}"

        where_clause = ""
        if conditions and isinstance(conditions, dict):
            where_conditions = []
            for field, value in conditions.items():
                if value is None:
                    where_conditions.append(f"{field} IS NULL")
                elif isinstance(value, (str, date, datetime, time)):
                    where_conditions.append(f"{field} = '{value}'")
                elif isinstance(value, bool):
                    where_conditions.append(f"{field} = {str(value).lower()}")
                else:
                    where_conditions.append(f"{field} = {value}")
            if where_conditions:
                where_clause = " WHERE " + " AND ".join(where_conditions)

        if sqltype == "select":
            base_fields = ", ".join([f"{table_name}.{field}" for field in datamodel.__fields__.keys()])
            join_sql = join_clause if join_clause else ""

            if select_fields:
                all_select_fields = select_fields
            else:
                all_select_fields = base_fields + related_fields

            if self.tenant_id and 'tenant_id' in datamodel.__fields__:
                tenant_condition = f"{table_name}.tenant_id = '{self.tenant_id}'"
                if where_clause:
                    where_clause = where_clause + f" AND {tenant_condition}"
                else:
                    where_clause = f" WHERE {tenant_condition}"

            additional_clauses = ""
            if addSqlQuery:
                if addSqlQuery.strip().upper().startswith('WHERE'):
                    where_part = addSqlQuery.lstrip('WHERE ')
                    if where_clause:
                        where_clause += f" AND {where_part}"
                    else:
                        where_clause = f" WHERE {where_part}"
                else:
                    additional_clauses = f" {addSqlQuery}"

            query = f"""SELECT {all_select_fields} FROM {table_name}{join_sql}{where_clause}{additional_clauses};"""
            query = query.replace("\n", "")
            return query

        elif sqltype == "insert":
            data_map = datamodel.dict(exclude_unset=True)
            if self.tenant_id and 'tenant_id' in datamodel.__fields__:
                data_map["tenant_id"] = self.tenant_id
            fields = ", ".join(data_map.keys())
            values = []
            for value in data_map.values():
                if value is None:
                    values.append("NULL")
                elif isinstance(value, (str, date, datetime, time)):
                    values.append(f"'{value}'")
                elif isinstance(value, bool):
                    values.append(str(value).lower())
                else:
                    values.append(str(value))
            values_str = ", ".join(values)
            return f"INSERT INTO {table_name} ({fields}) VALUES ({values_str}) RETURNING *;"

        elif sqltype == "update":
            if where_clause == "":
                raise ValueError("更新条件が指定されていません")

            if self.tenant_id and 'tenant_id' in datamodel.__fields__:
                tenant_condition = f"tenant_id = '{self.tenant_id}'"
                if where_clause:
                    where_clause = where_clause + f" AND {tenant_condition}"
                else:
                    where_clause = f" WHERE {tenant_condition}"

            update_values = []
            for field, value in datamodel.dict(exclude_unset=True).items():
                if value is None:
                    update_values.append(f"{field} = NULL")
                elif isinstance(value, (str, date, datetime, time)):
                    update_values.append(f"{field} = '{value}'")
                elif isinstance(value, bool):
                    update_values.append(f"{field} = {str(value).lower()}")
                else:
                    update_values.append(f"{field} = {value}")
            return f"UPDATE {table_name} SET {', '.join(update_values)} {where_clause} RETURNING *;"

        elif sqltype == "delete":
            if where_clause == "":
                raise ValueError("削除条件が指定されていません")

            if self.tenant_id and 'tenant_id' in datamodel.__fields__:
                tenant_condition = f"tenant_id = '{self.tenant_id}'"
                if where_clause:
                    where_clause = where_clause + f" AND {tenant_condition}"
                else:
                    where_clause = f" WHERE {tenant_condition}"

            return f"DELETE FROM {table_name} {where_clause} RETURNING *;"

        else:
            raise ValueError("無効なSQLタイプです。対応している種類: 'select', 'insert', 'update', 'delete'")
