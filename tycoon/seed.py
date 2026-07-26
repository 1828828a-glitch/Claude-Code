"""動作確認用のサンプルデータ。

business.example.yaml の段階構成に合わせてある。
自分の business.yaml に載せ替えたら、このデータは捨てて実データを入れてください。
"""

from __future__ import annotations

from datetime import date, timedelta

from .store import Store


def _days_ago(n: int) -> str:
    return (date.today() - timedelta(days=n)).isoformat()


def _days_ahead(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def seed(store: Store) -> int:
    """わざと「放置されている案件」を混ぜてある。AI社員がそれを見つけられるか試すため。"""
    if store.jobs():
        return 0

    tanaka = store.add_customer("田中製作所", email="tanaka@example.co.jp", type="法人")
    hernandez = store.add_customer("平野 さくら", email="hirano@example.com", type="個人")
    lopez = store.add_customer("株式会社ロペス商会", email="info@lopez.example.jp", type="法人")

    # 見積を出して13日放置。取りこぼし予備軍。
    job = store.add_job(
        "田中製作所 — 設備更新の設計",
        stage="estimate_sent",
        customer_id=tanaka["id"],
        amount=1_870_000,
        due_date=_days_ahead(21),
        source="紹介",
        scope="既存設備の実測、図面作成、施工業者への引き継ぎまで",
        last_contact=_days_ago(13),
    )
    job["communications"].append(
        {
            "at": _days_ago(13),
            "direction": "out",
            "channel": "email",
            "subject": "お見積のご送付",
            "body": "お世話になっております。ご依頼いただいた件のお見積を添付いたします。",
            "sent_by": "オーナー",
        }
    )
    job["updated_at"] = _days_ago(13)

    # 納品済みだが請求していない。静かに売上が消えるタイプの案件。
    job = store.add_job(
        "平野様 — 内装リニューアル",
        stage="delivered",
        customer_id=hernandez["id"],
        amount=623_000,
        due_date=_days_ago(20),
        source="Web問い合わせ",
        scope="1階フロアの内装一式",
        last_contact=_days_ago(19),
    )
    job["notes"].append(
        {"at": _days_ago(19), "by": "オーナー", "text": "現地で最終確認、先方OK。請求はまた今度。"}
    )
    job["updated_at"] = _days_ago(19)

    # 納期が迫っているのに着手前。
    store.add_job(
        "ロペス商会 — 什器製作",
        stage="won",
        customer_id=lopez["id"],
        amount=2_400_000,
        due_date=_days_ahead(5),
        source="展示会",
        scope="店舗什器 12点の製作と搬入",
        last_contact=_days_ago(4),
    )

    # 正常に動いている案件。ノイズとして混ぜる。
    store.add_job(
        "田中製作所 — 定期メンテナンス",
        stage="in_progress",
        customer_id=tanaka["id"],
        amount=180_000,
        due_date=_days_ahead(10),
        source="既存顧客",
        scope="四半期点検",
        last_contact=_days_ago(1),
    )

    store.add_job(
        "問い合わせ — 事務所移転の相談",
        stage="lead",
        customer_id=None,
        source="Web問い合わせ",
        scope="未確認",
        last_contact=_days_ago(2),
    )

    store.save()
    return len(store.jobs())
