class InvestigationScorer:
    HOP_PENALTY = 10
    def calculate(
        self,
        parent_score: int,
        depth: int,
    ) -> int:
        """
        Propagate risk through the graph.
        Every investigation hop reduces inherited
        risk by HOP_PENALTY.
        """
        propagated = (
            parent_score
            - self.HOP_PENALTY
        )
        return max(
            propagated,
            5,
        )
investigation_scorer = InvestigationScorer()