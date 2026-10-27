import { useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import {
  DataTable,
  Notice,
  PaginationControls,
  PageHeader,
  SearchField,
  SectionCard,
  useApiResource,
  useSubmitAction
} from "../components/ResourceHelpers";

const EMPTY_SUPPLIER = { name: "", contactName: "", email: "", phone: "", address: "", participantOrganization: "" };
const EMPTY_PRODUCT = { sku: "", name: "", description: "", unit: "unit", reorderPoint: "0" };

export default function SuppliersProductsPage() {
  const { user } = useAuth();
  const [supplierPage, setSupplierPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const suppliers = useApiResource(`/suppliers?page=${supplierPage}&limit=10&q=${encodeURIComponent(supplierSearch)}`);
  const products = useApiResource(`/products?page=${productPage}&limit=10&q=${encodeURIComponent(productSearch)}`);
  const partners = useApiResource("/partners/suppliers");
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [supplierMessage, setSupplierMessage] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [productMessage, setProductMessage] = useState("");
  const [productError, setProductError] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const canManage = ["admin", "manufacturer"].includes(user?.role);

  async function createSupplier(event) {
    event.preventDefault();
    setSupplierError("");
    setSupplierMessage("");
    setSavingSupplier(true);
    try {
      await api.post("/suppliers", {
        ...supplierForm,
        participantOrganization: supplierForm.participantOrganization || undefined
      });
      setSupplierForm(EMPTY_SUPPLIER);
      setSupplierMessage("Supplier directory entry created.");
      await suppliers.reload();
    } catch (error) {
      setSupplierError(error.response?.data?.message ?? "Could not create supplier.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    setProductError("");
    setProductMessage("");
    setSavingProduct(true);
    try {
      await api.post("/products", { ...productForm, reorderPoint: Number(productForm.reorderPoint) });
      setProductForm(EMPTY_PRODUCT);
      setProductMessage("Product added to your catalogue.");
      await products.reload();
    } catch (error) {
      setProductError(error.response?.data?.message ?? "Could not create product.");
    } finally {
      setSavingProduct(false);
    }
  }

  return (
    <div className="workspace-page">
      <PageHeader eyebrow="COLLABORATION" title="Suppliers & products" description="Maintain supplier relationships and the products your organization procures." />
      <div className="split-layout">
        <SectionCard title="Supplier directory" description="Supplier organizations are explicit participants; private records stay within your organization.">
          {supplierError && <Notice tone="error">{supplierError}</Notice>}
          {partners.error && <Notice tone="error">{partners.error}</Notice>}
          {supplierMessage && <Notice tone="success">{supplierMessage}</Notice>}
          {canManage && <form className="compact-form" onSubmit={createSupplier}>
            <label htmlFor="supplier-name">Supplier name</label><input id="supplier-name" value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} maxLength="160" required />
            <label htmlFor="supplier-partner">Registered supplier organization</label>
            <select id="supplier-partner" value={supplierForm.participantOrganization} onChange={(event) => setSupplierForm({ ...supplierForm, participantOrganization: event.target.value })} required>
              <option value="">Choose a registered supplier account</option>
              {(partners.data?.organizations ?? []).map((partner) => <option value={partner.id} key={partner.id}>{partner.name}</option>)}
            </select>
            <label htmlFor="supplier-contact">Contact name</label><input id="supplier-contact" value={supplierForm.contactName} onChange={(event) => setSupplierForm({ ...supplierForm, contactName: event.target.value })} maxLength="120" />
            <label htmlFor="supplier-email">Contact email</label><input id="supplier-email" type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} maxLength="254" />
            <button className="button button-primary" disabled={savingSupplier || partners.loading}>{savingSupplier ? "Saving…" : "Add supplier"}</button>
          </form>}
          <DataTable emptyMessage={suppliers.loading ? "Loading suppliers…" : "No suppliers in this organization's directory yet."} columns={[
            { key: "name", label: "Supplier" },
            { key: "contactName", label: "Contact" },
            { key: "email", label: "Email" },
            { key: "active", label: "Status", render: (row) => row.active ? "Active" : "Inactive" }
          ]} rows={suppliers.data?.suppliers ?? []} />
          <SearchField value={supplierSearch} onChange={(value) => { setSupplierSearch(value); setSupplierPage(1); }} label="Search supplier directory" />
          <PaginationControls pagination={suppliers.data?.pagination} page={supplierPage} onChange={setSupplierPage} />
        </SectionCard>

        <SectionCard title="Product catalogue" description="SKU and reorder values are used by purchase orders and inventory recommendations.">
          {productError && <Notice tone="error">{productError}</Notice>}
          {productMessage && <Notice tone="success">{productMessage}</Notice>}
          {canManage && <form className="compact-form" onSubmit={createProduct}>
            <label htmlFor="product-sku">SKU</label><input id="product-sku" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} maxLength="80" required />
            <label htmlFor="product-name">Product name</label><input id="product-name" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} maxLength="160" required />
            <label htmlFor="product-unit">Unit</label><input id="product-unit" value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} maxLength="32" required />
            <label htmlFor="product-reorder">Reorder point</label><input id="product-reorder" type="number" min="0" step="any" value={productForm.reorderPoint} onChange={(event) => setProductForm({ ...productForm, reorderPoint: event.target.value })} required />
            <button className="button button-primary" disabled={savingProduct}>{savingProduct ? "Saving…" : "Add product"}</button>
          </form>}
          <DataTable emptyMessage={products.loading ? "Loading products…" : "No products in this organization's catalogue yet."} columns={[
            { key: "sku", label: "SKU" },
            { key: "name", label: "Product" },
            { key: "unit", label: "Unit" },
            { key: "reorderPoint", label: "Reorder at" }
          ]} rows={products.data?.products ?? []} />
          <SearchField value={productSearch} onChange={(value) => { setProductSearch(value); setProductPage(1); }} label="Search product catalogue" />
          <PaginationControls pagination={products.data?.pagination} page={productPage} onChange={setProductPage} />
        </SectionCard>
      </div>
    </div>
  );
}
