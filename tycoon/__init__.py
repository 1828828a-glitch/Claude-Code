"""事業をゲームとして動かすための土台。まずはAI社員の層から。

構成:
    domain      事業定義（業種依存はすべてここに集約 / business.yaml で差し替え）
    store       実データ
    audit       監査ログ（誰が・いつ・何を・なぜ）
    tools       AI社員が使える道具。承認ゲートはツールの中にある
    agents      AI社員を1人動かす
    approvals   承認キュー
    cli         コマンドライン
"""

__all__ = ["domain", "store", "audit", "tools", "agents", "approvals"]
