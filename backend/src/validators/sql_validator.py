"""SQL validator backed by sqlglot AST inspection.

Public tests assume the pipeline rejects:
- Multi-statement / non-SELECT queries
- DML (INSERT/UPDATE/DELETE), DDL (CREATE/DROP/ALTER), PRAGMA, ATTACH, etc.
- References to tables or columns that do not exist in the dataset schema

When validation succeeds, a row LIMIT is injected on top-level SELECTs that lack
one, capping accidental full-table dumps.
"""

from __future__ import annotations

from dataclasses import dataclass

import sqlglot
from sqlglot import expressions as exp
from sqlglot.errors import ParseError

from src.constants.schema_constants import DEFAULT_ROW_LIMIT
from src.models.schema_models import SchemaContext


_ALLOWED_ROOT_TYPES: tuple[type, ...] = (exp.Select, exp.With, exp.Union)

_FORBIDDEN_NODE_TYPES: tuple[type, ...] = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Merge,
    exp.Create,
    exp.Drop,
    exp.Alter,
    exp.TruncateTable,
    exp.Pragma,
    exp.Attach,
    exp.Detach,
    exp.Transaction,
)


@dataclass(frozen=True)
class ValidationResult:
    is_valid: bool
    validated_sql: str | None
    error: str | None = None


class ValidationError(Exception):
    """Raised internally during AST checks; converted to a ValidationResult by validate()."""


def validate(
    sql: str | None,
    schema: SchemaContext,
    *,
    default_limit: int = DEFAULT_ROW_LIMIT,
) -> ValidationResult:
    if sql is None or not sql.strip():
        return ValidationResult(is_valid=False, validated_sql=None, error="no_sql_provided")

    try:
        statements = sqlglot.parse(sql, dialect="sqlite")
    except ParseError as exc:
        return ValidationResult(is_valid=False, validated_sql=None, error=f"parse_error: {exc}")

    statements = [s for s in statements if s is not None]
    if not statements:
        return ValidationResult(is_valid=False, validated_sql=None, error="empty_statement")
    if len(statements) > 1:
        return ValidationResult(
            is_valid=False, validated_sql=None, error="multiple_statements_not_allowed"
        )

    tree = statements[0]

    try:
        _enforce_root_is_select(tree)
        _enforce_no_forbidden_nodes(tree)
        _enforce_known_tables(tree, schema)
        _enforce_known_columns(tree, schema)
        capped = _ensure_limit(tree, default_limit)
    except ValidationError as exc:
        return ValidationResult(is_valid=False, validated_sql=None, error=str(exc))

    return ValidationResult(
        is_valid=True,
        validated_sql=capped.sql(dialect="sqlite"),
        error=None,
    )


def _enforce_root_is_select(tree: exp.Expression) -> None:
    if not isinstance(tree, _ALLOWED_ROOT_TYPES):
        raise ValidationError(f"root_not_select: {type(tree).__name__}")


def _enforce_no_forbidden_nodes(tree: exp.Expression) -> None:
    for node in tree.find_all(*_FORBIDDEN_NODE_TYPES):
        raise ValidationError(f"forbidden_operation: {type(node).__name__}")


def _enforce_known_tables(tree: exp.Expression, schema: SchemaContext) -> None:
    referenced = {t.name for t in tree.find_all(exp.Table) if t.name}
    if not referenced:
        return
    cte_names = {cte.alias for cte in tree.find_all(exp.CTE) if cte.alias}
    unknown = referenced - {schema.table} - cte_names
    if unknown:
        raise ValidationError(f"unknown_table: {sorted(unknown)}")


def _enforce_known_columns(tree: exp.Expression, schema: SchemaContext) -> None:
    # CTEs and derived subqueries introduce their own column scopes; defer those
    # to the executor rather than over-rejecting valid queries here.
    if any(True for _ in tree.find_all(exp.CTE)):
        return
    if any(True for _ in tree.find_all(exp.Subquery)):
        return

    real_columns = {c.name.lower() for c in schema.columns}
    aliases = {alias.alias.lower() for alias in tree.find_all(exp.Alias) if alias.alias}
    known = real_columns | aliases

    for column in tree.find_all(exp.Column):
        name = column.name
        if not name or name == "*":
            continue
        if name.lower() not in known:
            raise ValidationError(f"unknown_column: {name}")


def _ensure_limit(tree: exp.Expression, default_limit: int) -> exp.Expression:
    if isinstance(tree, exp.Select) and tree.args.get("limit") is None:
        return tree.limit(default_limit, copy=False)
    return tree
