from PIL import Image
import os

def create_pdf(image_folder, output_pdf_name):
    # Definition of the file names in order
    files = [
        "SLIDE-01-CAPA.png",
        "SLIDE-02-HOOK.png",
        "SLIDE-03-ECOSSISTEMA.png",
        "SLIDE-04-IA.png",
        "SLIDE-05-ATENDIMENTO.png",
        "SLIDE-06-INTEGRACOES.png",
        "SLIDE-07-RECURSOS.png",
        "SLIDE-08-CHECKLIST-PARTE-1.png",
        "SLIDE-09-CHECKLIST-PARTE-2.png",
        "SLIDE-10-CHECKLIST-PARTE-3.png",
        "SLIDE-11-BENEFICIOS-PARTE-1.png",
        "SLIDE-12-BENEFICIOS-PARTE-2.png",
        "SLIDE-13-INVESTIMENTO.png",
        "SLIDE-14-METRICAS-RESULTADOS.png",
        "SLIDE-15-CONTATO-CTA.png"
    ]

    image_list = []
    
    # Process the first image
    first_image_path = os.path.join(image_folder, files[0])
    if os.path.exists(first_image_path):
        image1 = Image.open(first_image_path)
        image1 = image1.convert('RGB')
    else:
        print(f"Error: {first_image_path} not found.")
        return

    # Process the remaining images
    for file in files[1:]:
        image_path = os.path.join(image_folder, file)
        if os.path.exists(image_path):
            img = Image.open(image_path)
            img = img.convert('RGB')
            image_list.append(img)
        else:
            print(f"Warning: {file} not found and will be skipped.")

    # Save as PDF
    output_path = os.path.join(image_folder, output_pdf_name)
    image1.save(output_path, save_all=True, append_images=image_list)
    print(f"PDF successfully created at: {output_path}")

if __name__ == "__main__":
    folder = r"c:\19 - Marketing\REPOSITÓRIO\PROSPOSTA UMANA"
    pdf_name = "Proposta_Comercial_UzzAi_Umana.pdf"
    create_pdf(folder, pdf_name)
