"""Config-driven rules: no TVTS names, module IDs or contacts in the engine."""

def match_response(config, query, route=None):
    from .tvts_matchers import is_tvts_score_query
    query = query.casefold()
    for rule in config.response_rules:
        if route and route.id in rule.excluded_routes:
            continue
        if not rule.enabled or any(k.strip() and k.strip().casefold() in query for k in rule.exclude_keywords):
            continue
        if rule.matcher == 'tvts_score':
            if is_tvts_score_query(query):
                return rule
            continue
        if any(k.strip() and k.strip().casefold() in query for k in rule.keywords):
            return rule
    return None


def finalize(config, text):
    from .response_cleaner import ResponseCleaner
    options = config.postprocessing
    # Check defer before cleanup so metadata cleanup cannot hide the refusal.
    if config.enforce_defer_only and config.fallback_message in text:
        return config.fallback_message
    if options.remove_artifacts:
        text = ResponseCleaner.remove_artifacts(text)
    if options.remove_suggestions:
        text = ResponseCleaner.remove_suggestion_blocks(text)
    if options.strip_topic_metadata:
        text = ResponseCleaner.strip_topic_section_metadata(text)
    if options.normalize_tables:
        text = ResponseCleaner.normalize_markdown_table_boundaries(text)
    # Generalized from TVTS _enforce_defer_only. Stronger: discard prefix too.
    if not text.strip() or (config.enforce_defer_only and config.fallback_message in text):
        return config.fallback_message
    return text
