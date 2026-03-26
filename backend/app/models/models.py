from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import DemandeStatut, LienParente, ListeCode, Sexe, UserRole


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    matricule: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    must_change_password: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    parent_profile: Mapped[Optional["Parent"]] = relationship(back_populates="user", uselist=False)


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nom: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    parents: Mapped[List["Parent"]] = relationship(back_populates="service")


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    parents: Mapped[List["Parent"]] = relationship(back_populates="site")


class Parent(TimestampMixin, Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prenom: Mapped[str] = mapped_column(String(255), nullable=False)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    matricule: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    telephone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    genre: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    nin: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    adresse: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    service_id: Mapped[Optional[int]] = mapped_column(ForeignKey("services.id"), nullable=True)
    site_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sites.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    user: Mapped["User"] = relationship(back_populates="parent_profile")
    service: Mapped[Optional["Service"]] = relationship(back_populates="parents")
    site: Mapped[Optional["Site"]] = relationship(back_populates="parents")

    enfants: Mapped[List["Enfant"]] = relationship(back_populates="parent", cascade="all, delete-orphan")


class Enfant(TimestampMixin, Base):
    __tablename__ = "enfants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id"), index=True, nullable=False)
    prenom: Mapped[str] = mapped_column(String(255), nullable=False)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    date_naissance: Mapped[date] = mapped_column(Date, nullable=False)
    sexe: Mapped[Sexe] = mapped_column(Enum(Sexe, name="sexe"), nullable=False)
    lien_parente: Mapped[LienParente] = mapped_column(Enum(LienParente, name="lien_parente"), nullable=False)
    is_titulaire: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    parent: Mapped["Parent"] = relationship(back_populates="enfants")
    demande_inscription: Mapped[Optional["DemandeInscription"]] = relationship(back_populates="enfant", uselist=False)


class Liste(Base):
    __tablename__ = "listes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[ListeCode] = mapped_column(Enum(ListeCode, name="liste_code"), unique=True, nullable=False)
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    demandes: Mapped[List["DemandeInscription"]] = relationship(back_populates="liste")


class DemandeInscription(Base):
    __tablename__ = "demandes_inscription"
    __table_args__ = (
        UniqueConstraint("enfant_id", name="uq_demande_enfant"),
        UniqueConstraint("liste_id", "rang_dans_liste", name="uq_liste_rang"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enfant_id: Mapped[int] = mapped_column(ForeignKey("enfants.id"), nullable=False)
    liste_id: Mapped[int] = mapped_column(ForeignKey("listes.id"), nullable=False, index=True)
    date_inscription: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    rang_dans_liste: Mapped[int] = mapped_column(Integer, nullable=False)
    statut: Mapped[DemandeStatut] = mapped_column(
        Enum(DemandeStatut, name="demande_statut"),
        nullable=False,
        server_default=DemandeStatut.SOUMISE.value,
    )
    non_validation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_selection_finale: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    selected_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    selected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    enfant: Mapped["Enfant"] = relationship(back_populates="demande_inscription")
    liste: Mapped["Liste"] = relationship(back_populates="demandes")
    selected_by: Mapped[Optional["User"]] = relationship(foreign_keys=[selected_by_user_id])

    desistement: Mapped[Optional["Desistement"]] = relationship(back_populates="demande_inscription", uselist=False)


class Desistement(Base):
    __tablename__ = "desistements"
    __table_args__ = (UniqueConstraint("demande_inscription_id", name="uq_desistement_demande"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    demande_inscription_id: Mapped[int] = mapped_column(ForeignKey("demandes_inscription.id"), nullable=False)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    validated: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    validated_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    validated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    demande_inscription: Mapped["DemandeInscription"] = relationship(back_populates="desistement")
    validated_by: Mapped[Optional["User"]] = relationship(foreign_keys=[validated_by_user_id])


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)

