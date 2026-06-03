import { GlassCard } from "@/components/shared/glass-card"
import { Button } from "@/components/ui/button"
import { CreditCard, FileText, Building2 } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function BillingPage() {
	return (
		<div className="container max-w-4xl mx-auto py-6 px-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Billing & Subscription</h1>
				<p className="text-muted-foreground">
					Manage your subscription, payment methods, and invoices.
				</p>
			</div>

			<div className="grid gap-6">
				{/* Current Plan */}
				<GlassCard glow>
					<div className="p-6 space-y-4">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<CreditCard className="h-5 w-5" />
								Current Plan
							</h3>
							<p className="text-sm text-muted-foreground">
								Your current subscription and billing cycle.
							</p>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Free Plan</p>
								<p className="text-sm text-muted-foreground">
									Basic features with limited access
								</p>
							</div>
							<Button>Upgrade to Pro</Button>
						</div>
					</div>
				</GlassCard>

				{/* Payment Methods */}
				<GlassCard>
					<div className="p-6 space-y-4">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Payment Methods
							</h3>
							<p className="text-sm text-muted-foreground">
								Manage your saved payment methods.
							</p>
						</div>
						<p className="text-muted-foreground text-sm">
							No payment methods saved. Add a payment method when you upgrade to a paid plan.
						</p>
					</div>
				</GlassCard>

				{/* Invoices */}
				<GlassCard>
					<div className="p-6 space-y-4">
						<div>
							<h3 className="text-lg font-semibold flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Invoices
							</h3>
							<p className="text-sm text-muted-foreground">
								View and download your past invoices.
							</p>
						</div>
						<p className="text-muted-foreground text-sm">
							No invoices available. Invoices will appear here after your first payment.
						</p>
					</div>
				</GlassCard>

				{/* Billing Contact */}
				<GlassCard>
					<div className="p-6 space-y-4">
						<div>
							<h3 className="text-lg font-semibold">Billing Contact</h3>
							<p className="text-sm text-muted-foreground">
								Update your billing contact information.
							</p>
						</div>
						<p className="text-muted-foreground text-sm">
							Billing contact features coming soon.
						</p>
					</div>
				</GlassCard>

				<div className="flex justify-center pt-4">
					<Button variant="outline" asChild>
						<Link href="/settings">Back to Settings</Link>
					</Button>
				</div>
			</div>
		</div>
	)
}
