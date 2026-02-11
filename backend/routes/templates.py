"""
Template CRUD endpoints
"""
from flask import Blueprint, request, jsonify

from extensions import db
from models import Template


# Blueprint
templates_bp = Blueprint('templates', __name__)


@templates_bp.route("/api/templates", methods=["GET"])
def get_templates():
    """
    Get all templates

    Returns:
        [
            {
                "id": 1,
                "user_name": "user1",
                "name": "My Template",
                "keywords": ["keyword1", "keyword2"],
                "domains": ["domain1.com", "domain2.com"],
                "created_at": "2024-01-01T00:00:00"
            },
            ...
        ]
    """
    templates = Template.query.order_by(Template.created_at.desc()).all()

    return jsonify([
        {
            "id": t.id,
            "user_name": t.user_name,
            "name": t.name,
            "keywords": [k.strip() for k in t.keywords.split("\n") if k.strip()],
            "domains": [d.strip() for d in t.domains.split("\n") if d.strip()],
            "created_at": t.created_at.isoformat() + 'Z' if t.created_at else None
        }
        for t in templates
    ])


@templates_bp.route("/api/templates", methods=["POST"])
def create_template():
    """
    Create new template

    Request JSON:
        {
            "user_name": "user1",
            "name": "My Template",
            "keywords": ["keyword1", "keyword2"],
            "domains": ["domain1.com", "domain2.com"]
        }

    Returns:
        {
            "message": "Tạo template thành công",
            "id": 1,
            "template": {...}
        }

    Errors:
        400: Missing user_name or name
    """
    data = request.json

    if not data.get("user_name") or not data.get("name"):
        return jsonify({"error": "Thiếu user_name hoặc name"}), 400

    # Filter out empty strings from keywords and domains
    keywords = [k.strip() for k in data.get("keywords", []) if k.strip()]
    domains = [d.strip() for d in data.get("domains", []) if d.strip()]

    template = Template(
        user_name=data["user_name"].strip(),
        name=data["name"].strip(),
        keywords="\n".join(keywords),
        domains="\n".join(domains),
    )

    db.session.add(template)
    db.session.commit()

    # Return the created template with full data
    return jsonify({
        "message": "Tạo template thành công",
        "id": template.id,
        "template": {
            "id": template.id,
            "user_name": template.user_name,
            "name": template.name,
            "keywords": keywords,
            "domains": domains,
            "created_at": template.created_at.isoformat() + 'Z' if template.created_at else None
        }
    }), 201


@templates_bp.route("/api/templates/<int:template_id>", methods=["PUT"])
def update_template(template_id):
    """
    Update existing template

    Request JSON:
        {
            "name": "Updated Name",
            "keywords": ["new_keyword"],
            "domains": ["new_domain.com"]
        }

    Returns:
        {
            "message": "Cập nhật thành công",
            "template": {...}
        }

    Errors:
        404: Template not found
    """
    data = request.json
    template = Template.query.get_or_404(template_id)

    # Update fields if provided
    if "name" in data:
        template.name = data["name"].strip()

    if "keywords" in data:
        keywords = [k.strip() for k in data.get("keywords", []) if k.strip()]
        template.keywords = "\n".join(keywords)

    if "domains" in data:
        domains = [d.strip() for d in data.get("domains", []) if d.strip()]
        template.domains = "\n".join(domains)

    db.session.commit()

    # Return updated template data
    return jsonify({
        "message": "Cập nhật thành công",
        "template": {
            "id": template.id,
            "user_name": template.user_name,
            "name": template.name,
            "keywords": [k.strip() for k in template.keywords.split("\n") if k.strip()],
            "domains": [d.strip() for d in template.domains.split("\n") if d.strip()],
            "created_at": template.created_at.isoformat() + 'Z' if template.created_at else None
        }
    })


@templates_bp.route("/api/templates/<int:template_id>", methods=["DELETE"])
def delete_template(template_id):
    """
    Delete template

    Returns:
        {"message": "Đã xóa template"}

    Errors:
        404: Template not found
    """
    template = Template.query.get_or_404(template_id)
    db.session.delete(template)
    db.session.commit()

    return jsonify({"message": "Đã xóa template"})
